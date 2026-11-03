import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAdminTabs1793000000000 implements MigrationInterface {
  name = 'AddUserAdminTabs1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminTabs" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "adminTabs"`);
  }
}
