import { MigrationInterface, QueryRunner } from "typeorm";

export class MakePersonNameOptional1766552936407 implements MigrationInterface {
    name = 'MakePersonNameOptional1766552936407'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" ALTER COLUMN "personName" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" ALTER COLUMN "personName" SET NOT NULL`);
    }

}
