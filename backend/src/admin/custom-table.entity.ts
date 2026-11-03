import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export interface CustomColumnDef {
  name: string;
  type: string;
  nullable: boolean;
}

// Registry of tables created via the Admin Center's schema manager. Only
// tables tracked here can have their rows browsed/edited generically, and
// only these can be dropped — built-in app tables can only gain new columns,
// never lose them or get deleted, through this tool.
@Entity('custom_tables')
export class CustomTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  tableName: string;

  @Column({ type: 'simple-json' })
  columns: CustomColumnDef[];

  @Column({ type: 'varchar', nullable: true })
  createdByEmail?: string;

  @CreateDateColumn()
  createdAt: Date;
}
