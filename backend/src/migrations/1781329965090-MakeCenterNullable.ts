import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeCenterNullable1781329965090 implements MigrationInterface {
    name = 'MakeCenterNullable1781329965090'

    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
            await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN IF EXISTS "workLogTaskId"`);
        } catch (e) {
            // ignore if column or table doesn't exist
        }
        await queryRunner.query(`ALTER TABLE "meetings" ALTER COLUMN "center" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" ALTER COLUMN "center" SET NOT NULL`);
        try {
            await queryRunner.query(`ALTER TABLE "cards" ADD "workLogTaskId" uuid`);
        } catch (e) {
            // ignore
        }
    }

}
