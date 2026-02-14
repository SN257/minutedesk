import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScheduledMeetingIdAndAgenda1736524800000 implements MigrationInterface {
    name = 'AddScheduledMeetingIdAndAgenda1736524800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" ADD "scheduledMeetingId" character varying`);
        await queryRunner.query(`ALTER TABLE "meetings" ADD "agenda" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "agenda"`);
        await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "scheduledMeetingId"`);
    }

}
