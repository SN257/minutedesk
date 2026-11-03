import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompletionTimestamps1789000000000 implements MigrationInterface {
  name = 'AddCompletionTimestamps1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" ADD "completedAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "cards" ADD "archivedAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "archivedAt"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "completedAt"`);
  }
}
