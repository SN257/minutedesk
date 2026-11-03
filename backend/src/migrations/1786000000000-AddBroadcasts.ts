import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBroadcasts1786000000000 implements MigrationInterface {
  name = 'AddBroadcasts1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "broadcasts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "body" text,
        "audience" character varying NOT NULL,
        "recipientCount" integer NOT NULL DEFAULT 0,
        "sentByEmail" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_broadcasts_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "broadcasts"`);
  }
}
