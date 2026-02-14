import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPresentSantNameField1766640239573 implements MigrationInterface {
    name = 'AddPresentSantNameField1766640239573'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" ADD "presentSantName" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "presentSantName"`);
    }

}
