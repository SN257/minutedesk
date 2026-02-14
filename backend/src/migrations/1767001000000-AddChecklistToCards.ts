import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChecklistToCards1767001000000 implements MigrationInterface {
    name = 'AddChecklistToCards1767001000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cards" ADD COLUMN "checklist" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "checklist"`);
    }

}
