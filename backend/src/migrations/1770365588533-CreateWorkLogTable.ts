import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkLogTable1770365588533 implements MigrationInterface {
    name = 'CreateWorkLogTable1770365588533'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_userId_users_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_userId"`);
        await queryRunner.query(`CREATE TABLE "work_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "date" date NOT NULL, "todayWork" text, "tomorrowWork" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f4f3234af57451baa20576887be" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c03bc8dc60259cd79cf6b49de1" ON "work_logs" ("userId", "date") `);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" DROP COLUMN "personName"`);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" DROP COLUMN "day"`);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" DROP COLUMN "place"`);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" DROP COLUMN "attendance"`);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" DROP COLUMN "presentSantName"`);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" DROP COLUMN "notes"`);
        await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "coverSize"`);
        await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "completed"`);
        await queryRunner.query(`CREATE INDEX "IDX_166bd96559cb38595d392f75a3" ON "tasks" ("userId") `);
        await queryRunner.query(`ALTER TABLE "work_logs" ADD CONSTRAINT "FK_699ea8c6b5b4acc9eebbdb9058d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work_logs" DROP CONSTRAINT "FK_699ea8c6b5b4acc9eebbdb9058d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_166bd96559cb38595d392f75a3"`);
        await queryRunner.query(`ALTER TABLE "cards" ADD "completed" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "cards" ADD "coverSize" character varying DEFAULT 'small'`);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" ADD "notes" text`);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" ADD "presentSantName" character varying`);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" ADD "attendance" text`);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" ADD "place" character varying`);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" ADD "day" character varying`);
        await queryRunner.query(`ALTER TABLE "scheduled_meetings" ADD "personName" character varying`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c03bc8dc60259cd79cf6b49de1"`);
        await queryRunner.query(`DROP TABLE "work_logs"`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_userId" ON "tasks" ("userId") `);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_userId_users_id" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
