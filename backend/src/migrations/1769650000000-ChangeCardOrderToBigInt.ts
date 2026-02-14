import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeCardOrderToBigInt1769650000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change 'order' column on cards from integer to bigint to support large timestamps
    await queryRunner.query(`ALTER TABLE "cards" ALTER COLUMN "order" TYPE bigint USING "order"::bigint;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to integer (may overflow if values exceed int range)
    await queryRunner.query(`ALTER TABLE "cards" ALTER COLUMN "order" TYPE integer USING ("order")::integer;`);
  }
}
