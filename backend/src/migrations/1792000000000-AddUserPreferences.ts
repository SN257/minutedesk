import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPreferences1792000000000 implements MigrationInterface {
  name = 'AddUserPreferences1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferences" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "preferences"`);
  }
}
