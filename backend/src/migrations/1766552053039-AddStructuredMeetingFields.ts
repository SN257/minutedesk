import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStructuredMeetingFields1766552053039 implements MigrationInterface {
    name = 'AddStructuredMeetingFields1766552053039'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" ADD "day" character varying`);
        await queryRunner.query(`ALTER TABLE "meetings" ADD "place" character varying`);
        await queryRunner.query(`ALTER TABLE "meetings" ADD "attendance" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "attendance"`);
        await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "place"`);
        await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "day"`);
    }

}
