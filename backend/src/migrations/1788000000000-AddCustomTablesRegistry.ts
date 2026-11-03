import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomTablesRegistry1788000000000 implements MigrationInterface {
  name = 'AddCustomTablesRegistry1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "custom_tables" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tableName" character varying NOT NULL,
        "columns" text NOT NULL,
        "createdByEmail" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_custom_tables_tableName" UNIQUE ("tableName"),
        CONSTRAINT "PK_custom_tables_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_tables"`);
  }
}
