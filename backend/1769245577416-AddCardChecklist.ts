import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCardChecklist1769245577416 implements MigrationInterface {
    name = 'AddCardChecklist1769245577416'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_userId_users_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_scheduled_meetings_date"`);
        await queryRunner.query(`ALTER TABLE "cards" ADD "checklist" text`);
        await queryRunner.query(`CREATE INDEX "IDX_166bd96559cb38595d392f75a3" ON "tasks" ("userId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_166bd96559cb38595d392f75a3"`);
        await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "checklist"`);
        await queryRunner.query(`CREATE INDEX "IDX_scheduled_meetings_date" ON "scheduled_meetings" ("date") `);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_userId" ON "tasks" ("userId") `);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_userId_users_id" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
