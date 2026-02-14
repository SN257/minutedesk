import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTasksTable1766750000000 implements MigrationInterface {
    name = 'CreateTasksTable1766750000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tasks" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "userId" uuid NOT NULL,
            "title" character varying NOT NULL,
            "description" text,
            "dueDate" date,
            "completed" boolean NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"),
            CONSTRAINT "FK_tasks_userId_users_id" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_tasks_userId" ON "tasks" ("userId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_tasks_userId"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
    }
}
