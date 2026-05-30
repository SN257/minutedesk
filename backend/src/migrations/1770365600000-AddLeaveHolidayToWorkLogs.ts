import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaveHolidayToWorkLogs1770365600000 implements MigrationInterface {
  name = 'AddLeaveHolidayToWorkLogs1770365600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "work_logs" ADD "todayOnLeave" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "work_logs" ADD "todayHoliday" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "work_logs" ADD "tomorrowOnLeave" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "work_logs" ADD "tomorrowHoliday" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "work_logs" DROP COLUMN "tomorrowHoliday"`);
    await queryRunner.query(`ALTER TABLE "work_logs" DROP COLUMN "tomorrowOnLeave"`);
    await queryRunner.query(`ALTER TABLE "work_logs" DROP COLUMN "todayHoliday"`);
    await queryRunner.query(`ALTER TABLE "work_logs" DROP COLUMN "todayOnLeave"`);
  }
}
