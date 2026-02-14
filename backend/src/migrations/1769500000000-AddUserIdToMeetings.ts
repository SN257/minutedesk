import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToMeetings1769500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add userId column to meetings table
    await queryRunner.query(`
      ALTER TABLE "meetings" 
      ADD COLUMN "userId" uuid;
    `);

    // Set a default userId for existing records (use first user in system)
    await queryRunner.query(`
      UPDATE "meetings" 
      SET "userId" = (SELECT id FROM users LIMIT 1)
      WHERE "userId" IS NULL;
    `);

    // Make userId NOT NULL after setting defaults
    await queryRunner.query(`
      ALTER TABLE "meetings" 
      ALTER COLUMN "userId" SET NOT NULL;
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "meetings" 
      ADD CONSTRAINT "FK_meetings_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "meetings" 
      DROP CONSTRAINT "FK_meetings_userId";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "meetings" 
      DROP COLUMN "userId";
    `);
  }
}
