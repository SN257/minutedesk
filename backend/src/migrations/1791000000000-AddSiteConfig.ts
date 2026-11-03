import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSiteConfig1791000000000 implements MigrationInterface {
  name = 'AddSiteConfig1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "site_config" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "draft" text,
      "published" text,
      "publishedAt" timestamp,
      "updatedAt" timestamp NOT NULL DEFAULT now(),
      CONSTRAINT "PK_site_config" PRIMARY KEY ("id")
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "site_config"`);
  }
}
