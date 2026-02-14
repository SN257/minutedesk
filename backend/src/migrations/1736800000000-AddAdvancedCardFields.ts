import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdvancedCardFields1736800000000 implements MigrationInterface {
    name = 'AddAdvancedCardFields1736800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cards" ADD "labels" text`);
        await queryRunner.query(`ALTER TABLE "cards" ADD "priority" character varying`);
        await queryRunner.query(`ALTER TABLE "cards" ADD "assignee" character varying`);
        await queryRunner.query(`ALTER TABLE "cards" ADD "coverColor" character varying`);
        await queryRunner.query(`ALTER TABLE "cards" ADD "archived" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "archived"`);
        await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "coverColor"`);
        await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "assignee"`);
        await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "priority"`);
        await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "labels"`);
    }
}
