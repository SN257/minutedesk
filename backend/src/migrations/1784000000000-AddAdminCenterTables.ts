import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminCenterTables1784000000000 implements MigrationInterface {
  name = 'AddAdminCenterTables1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid,
        "userEmail" character varying,
        "method" character varying NOT NULL,
        "path" character varying NOT NULL,
        "statusCode" integer,
        "durationMs" integer,
        "ip" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_logs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_activity_logs_userId" ON "activity_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_activity_logs_createdAt" ON "activity_logs" ("createdAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "error_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "source" character varying NOT NULL,
        "message" character varying NOT NULL,
        "stack" text,
        "path" character varying,
        "userId" uuid,
        "userEmail" character varying,
        "statusCode" integer,
        "status" character varying NOT NULL DEFAULT 'open',
        "meta" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "resolvedAt" TIMESTAMP,
        CONSTRAINT "PK_error_logs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_error_logs_source" ON "error_logs" ("source")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_error_logs_status" ON "error_logs" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_error_logs_createdAt" ON "error_logs" ("createdAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "backup_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "filename" character varying NOT NULL,
        "sizeBytes" bigint NOT NULL DEFAULT '0',
        "status" character varying NOT NULL DEFAULT 'success',
        "error" text,
        "emailed" boolean NOT NULL DEFAULT false,
        "manual" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_backup_records_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "siteName" character varying NOT NULL DEFAULT 'MinuteDesk',
        "logoUrl" character varying,
        "faviconUrl" character varying,
        "primaryColor" character varying NOT NULL DEFAULT '#1e293b',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_settings_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "app_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "backup_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "error_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs"`);
  }
}
