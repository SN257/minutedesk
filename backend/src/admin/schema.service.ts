import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CustomTable, CustomColumnDef } from './custom-table.entity';

const IDENTIFIER_RE = /^[a-z][a-z0-9_]{0,62}$/;

// Tables no operation in this service is allowed to touch, even by a super
// admin — altering these could break session handling, migration tracking,
// or this very registry.
const PROTECTED_TABLES = new Set(['migrations', 'session', 'typeorm_metadata', 'custom_tables']);

const COLUMN_TYPES: Record<string, string> = {
  text: 'text',
  varchar: 'character varying',
  integer: 'integer',
  bigint: 'bigint',
  boolean: 'boolean',
  timestamp: 'timestamp',
  date: 'date',
  numeric: 'numeric',
  uuid: 'uuid',
  jsonb: 'jsonb',
};

interface NewColumnInput {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
}

const assertValidIdentifier = (name: string, kind: string): string => {
  const normalized = name.trim().toLowerCase();
  if (!IDENTIFIER_RE.test(normalized)) {
    throw new HttpException(
      `${kind} name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores (max 63 chars)`,
      HttpStatus.BAD_REQUEST,
    );
  }
  return normalized;
};

const assertKnownType = (type: string): string => {
  const pgType = COLUMN_TYPES[type];
  if (!pgType) {
    throw new HttpException(`Unsupported column type "${type}". Allowed: ${Object.keys(COLUMN_TYPES).join(', ')}`, HttpStatus.BAD_REQUEST);
  }
  return pgType;
};

const assertNotProtected = (table: string) => {
  if (PROTECTED_TABLES.has(table)) {
    throw new HttpException(`"${table}" is a protected system table and cannot be modified here`, HttpStatus.FORBIDDEN);
  }
};

@Injectable()
export class SchemaService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(CustomTable) private readonly registryRepo: Repository<CustomTable>,
  ) {}

  async listTables() {
    const rows = await this.dataSource.query(`
      SELECT c.relname AS name, GREATEST(c.reltuples, 0)::bigint AS approx_rows
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r' AND n.nspname = 'public'
      ORDER BY c.relname ASC
    `);
    const custom = await this.registryRepo.find();
    const customNames = new Set(custom.map((c) => c.tableName));
    return rows.map((r: any) => ({
      name: r.name,
      approxRows: Number(r.approx_rows),
      isCustom: customNames.has(r.name),
      isProtected: PROTECTED_TABLES.has(r.name),
    }));
  }

  async getColumns(table: string) {
    const normalized = assertValidIdentifier(table, 'Table');
    const rows = await this.dataSource.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position ASC`,
      [normalized],
    );
    if (rows.length === 0) throw new HttpException('Table not found', HttpStatus.NOT_FOUND);
    return rows.map((r: any) => ({
      name: r.column_name,
      type: r.data_type,
      nullable: r.is_nullable === 'YES',
      default: r.column_default,
    }));
  }

  async createTable(name: string, columns: NewColumnInput[], createdByEmail?: string) {
    const tableName = assertValidIdentifier(name, 'Table');
    assertNotProtected(tableName);

    const existing = await this.dataSource.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [tableName],
    );
    if (existing.length > 0) throw new HttpException(`Table "${tableName}" already exists`, HttpStatus.CONFLICT);

    if (!columns || columns.length === 0) {
      throw new HttpException('At least one column is required', HttpStatus.BAD_REQUEST);
    }

    const columnDefs: CustomColumnDef[] = [];
    const columnSql: string[] = [];
    for (const col of columns) {
      const colName = assertValidIdentifier(col.name, 'Column');
      if (colName === 'id' || colName === 'createdAt') {
        throw new HttpException(`"${colName}" is added automatically — choose a different column name`, HttpStatus.BAD_REQUEST);
      }
      const pgType = assertKnownType(col.type);
      if (!col.nullable && (col.defaultValue === undefined || col.defaultValue === '')) {
        throw new HttpException(`Column "${colName}" is required, so it needs a default value`, HttpStatus.BAD_REQUEST);
      }
      let sql = `"${colName}" ${pgType}`;
      if (!col.nullable) sql += ' NOT NULL';
      if (col.defaultValue !== undefined && col.defaultValue !== '') {
        sql += ` DEFAULT '${String(col.defaultValue).replace(/'/g, "''")}'`;
      }
      columnSql.push(sql);
      columnDefs.push({ name: colName, type: col.type, nullable: col.nullable });
    }

    await this.dataSource.query(`
      CREATE TABLE "${tableName}" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        ${columnSql.join(',\n        ')},
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_${tableName}_id" PRIMARY KEY ("id")
      )
    `);

    return this.registryRepo.save(this.registryRepo.create({ tableName, columns: columnDefs, createdByEmail }));
  }

  async addColumn(table: string, col: NewColumnInput) {
    const tableName = assertValidIdentifier(table, 'Table');
    assertNotProtected(tableName);
    const colName = assertValidIdentifier(col.name, 'Column');
    const pgType = assertKnownType(col.type);

    const tableExists = await this.dataSource.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [tableName],
    );
    if (tableExists.length === 0) throw new HttpException('Table not found', HttpStatus.NOT_FOUND);

    if (!col.nullable && (col.defaultValue === undefined || col.defaultValue === '')) {
      throw new HttpException('A required column needs a default value (existing rows will be backfilled with it)', HttpStatus.BAD_REQUEST);
    }

    let sql = `ALTER TABLE "${tableName}" ADD COLUMN "${colName}" ${pgType}`;
    if (col.defaultValue !== undefined && col.defaultValue !== '') {
      sql += ` DEFAULT '${String(col.defaultValue).replace(/'/g, "''")}'`;
    }
    if (!col.nullable) sql += ' NOT NULL';
    await this.dataSource.query(sql);

    const registryEntry = await this.registryRepo.findOne({ where: { tableName } });
    if (registryEntry) {
      registryEntry.columns = [...registryEntry.columns, { name: colName, type: col.type, nullable: col.nullable }];
      await this.registryRepo.save(registryEntry);
    }

    return this.getColumns(tableName);
  }

  async dropColumn(table: string, columnName: string) {
    const tableName = assertValidIdentifier(table, 'Table');
    const colName = assertValidIdentifier(columnName, 'Column');
    const registryEntry = await this.registryRepo.findOne({ where: { tableName } });
    if (!registryEntry) {
      throw new HttpException('Columns can only be dropped from tables created in this Schema Manager, not built-in app tables', HttpStatus.FORBIDDEN);
    }
    await this.dataSource.query(`ALTER TABLE "${tableName}" DROP COLUMN "${colName}"`);
    registryEntry.columns = registryEntry.columns.filter((c) => c.name !== colName);
    await this.registryRepo.save(registryEntry);
    return this.getColumns(tableName);
  }

  async dropTable(table: string) {
    const tableName = assertValidIdentifier(table, 'Table');
    const registryEntry = await this.registryRepo.findOne({ where: { tableName } });
    if (!registryEntry) {
      throw new HttpException('Only tables created in this Schema Manager can be dropped here, not built-in app tables', HttpStatus.FORBIDDEN);
    }
    await this.dataSource.query(`DROP TABLE "${tableName}"`);
    await this.registryRepo.remove(registryEntry);
  }

  // ── Generic row CRUD — custom (registry-tracked) tables only ─────────────
  private async requireCustomTable(table: string): Promise<CustomTable> {
    const tableName = assertValidIdentifier(table, 'Table');
    const entry = await this.registryRepo.findOne({ where: { tableName } });
    if (!entry) {
      throw new HttpException('Row browsing/editing is only available for tables created in this Schema Manager', HttpStatus.FORBIDDEN);
    }
    return entry;
  }

  async listRows(table: string, limit = 100) {
    const entry = await this.requireCustomTable(table);
    const rows = await this.dataSource.query(`SELECT * FROM "${entry.tableName}" ORDER BY "createdAt" DESC LIMIT $1`, [Math.min(limit, 500)]);
    return { columns: entry.columns, rows };
  }

  async createRow(table: string, data: Record<string, any>) {
    const entry = await this.requireCustomTable(table);
    const allowedNames = new Set(entry.columns.map((c) => c.name));
    const keys = Object.keys(data).filter((k) => allowedNames.has(k));
    if (keys.length === 0) throw new HttpException('No valid columns provided', HttpStatus.BAD_REQUEST);
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    const sql = `INSERT INTO "${entry.tableName}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await this.dataSource.query(sql, keys.map((k) => data[k]));
    return result[0];
  }

  async updateRow(table: string, id: string, data: Record<string, any>) {
    const entry = await this.requireCustomTable(table);
    const allowedNames = new Set(entry.columns.map((c) => c.name));
    const keys = Object.keys(data).filter((k) => allowedNames.has(k));
    if (keys.length === 0) throw new HttpException('No valid columns provided', HttpStatus.BAD_REQUEST);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
    const sql = `UPDATE "${entry.tableName}" SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await this.dataSource.query(sql, [id, ...keys.map((k) => data[k])]);
    if (result.length === 0) throw new HttpException('Row not found', HttpStatus.NOT_FOUND);
    return result[0];
  }

  async deleteRow(table: string, id: string) {
    const entry = await this.requireCustomTable(table);
    await this.dataSource.query(`DELETE FROM "${entry.tableName}" WHERE id = $1`, [id]);
  }
}
