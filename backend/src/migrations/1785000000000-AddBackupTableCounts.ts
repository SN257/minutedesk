import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBackupTableCounts1785000000000 implements MigrationInterface {
  name = 'AddBackupTableCounts1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "backup_records" ADD COLUMN IF NOT EXISTS "tableCounts" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "backup_records" DROP COLUMN IF EXISTS "tableCounts"`);
  }
}
