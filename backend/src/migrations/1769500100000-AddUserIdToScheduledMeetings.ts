import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToScheduledMeetings1769500100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add userId column to scheduled_meetings table
    await queryRunner.query(`
      ALTER TABLE "scheduled_meetings" 
      ADD COLUMN "userId" uuid;
    `);

    // Set a default userId for existing records (use first user in system)
    await queryRunner.query(`
      UPDATE "scheduled_meetings" 
      SET "userId" = (SELECT id FROM users LIMIT 1)
      WHERE "userId" IS NULL;
    `);

    // Make userId NOT NULL after setting defaults
    await queryRunner.query(`
      ALTER TABLE "scheduled_meetings" 
      ALTER COLUMN "userId" SET NOT NULL;
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "scheduled_meetings" 
      ADD CONSTRAINT "FK_scheduled_meetings_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "scheduled_meetings" 
      DROP CONSTRAINT "FK_scheduled_meetings_userId";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "scheduled_meetings" 
      DROP COLUMN "userId";
    `);
  }
}
