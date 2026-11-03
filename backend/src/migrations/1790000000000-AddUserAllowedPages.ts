import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAllowedPages1790000000000 implements MigrationInterface {
  name = 'AddUserAllowedPages1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "allowedPages" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "allowedPages"`);
  }
}
