import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimezoneToUsers1783000000000 implements MigrationInterface {
  name = 'AddTimezoneToUsers1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone"`);
  }
}
