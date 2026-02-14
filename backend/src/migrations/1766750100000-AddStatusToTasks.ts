import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusToTasks1766750100000 implements MigrationInterface {
    name = 'AddStatusToTasks1766750100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ADD COLUMN "status" character varying NOT NULL DEFAULT 'todo'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "status"`);
    }
}
