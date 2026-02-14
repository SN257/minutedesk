import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMeetingsTable1766404526330 implements MigrationInterface {
    name = 'CreateMeetingsTable1766404526330'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "meetings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "center" character varying NOT NULL, "personName" character varying NOT NULL, "date" date NOT NULL, "startTime" character varying NOT NULL, "endTime" character varying NOT NULL, "meetingType" character varying NOT NULL, "notes" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_aa73be861afa77eb4ed31f3ed57" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "meetings"`);
    }

}
