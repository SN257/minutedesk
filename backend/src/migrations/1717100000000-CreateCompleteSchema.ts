import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompleteSchema1717100000000 implements MigrationInterface {
  name = 'CreateCompleteSchema1717100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "name" character varying,
        "role" character varying NOT NULL DEFAULT 'user',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);

    // Meetings table
    await queryRunner.query(`
      CREATE TABLE "meetings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "center" character varying NOT NULL,
        "personName" character varying,
        "date" date NOT NULL,
        "day" character varying,
        "startTime" character varying NOT NULL,
        "endTime" character varying NOT NULL,
        "place" character varying,
        "attendance" text,
        "presentSantName" character varying,
        "meetingType" character varying NOT NULL,
        "scheduledMeetingId" character varying,
        "agenda" jsonb,
        "notes" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meetings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_meetings_userId" ON "meetings" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_meetings_date" ON "meetings" ("date")`);

    // Scheduled Meetings table
    await queryRunner.query(`
      CREATE TABLE "scheduled_meetings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "date" date NOT NULL,
        "start_time" character varying NOT NULL,
        "end_time" character varying NOT NULL,
        "duration" integer NOT NULL,
        "meeting_type" character varying,
        "center" character varying,
        "participants" integer NOT NULL DEFAULT 3,
        "agenda" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scheduled_meetings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_scheduled_meetings_userId" ON "scheduled_meetings" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_scheduled_meetings_date" ON "scheduled_meetings" ("date")`);

    // Tasks table
    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'todo',
        "description" text,
        "dueDate" date,
        "completed" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_tasks_userId" ON "tasks" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_tasks_status" ON "tasks" ("status")`);

    // Boards table
    await queryRunner.query(`
      CREATE TABLE "boards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_boards" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_boards_userId" ON "boards" ("userId")`);

    // Lists table
    await queryRunner.query(`
      CREATE TABLE "lists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "boardId" uuid NOT NULL,
        "order" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lists" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_lists_boardId" ON "lists" ("boardId")`);

    // Cards table
    await queryRunner.query(`
      CREATE TABLE "cards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "dueDate" date,
        "order" bigint NOT NULL DEFAULT '0',
        "listId" uuid NOT NULL,
        "labels" text,
        "priority" character varying,
        "assignee" character varying,
        "coverColor" character varying,
        "archived" boolean NOT NULL DEFAULT false,
        "checklist" text,
        "workLogDate" date,
        "workLogSource" character varying,
        "workLogTaskId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cards" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_cards_listId" ON "cards" ("listId")`);
    await queryRunner.query(`CREATE INDEX "IDX_cards_archived" ON "cards" ("archived")`);
    await queryRunner.query(`CREATE INDEX "IDX_cards_workLogDate" ON "cards" ("workLogDate")`);

    // Comments table
    await queryRunner.query(`
      CREATE TABLE "comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cardId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "text" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_comments_cardId" ON "comments" ("cardId")`);
    await queryRunner.query(`CREATE INDEX "IDX_comments_userId" ON "comments" ("userId")`);

    // Work Logs table
    await queryRunner.query(`
      CREATE TABLE "work_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "date" date NOT NULL,
        "todayWork" text,
        "todayOnLeave" boolean NOT NULL DEFAULT false,
        "todayHoliday" boolean NOT NULL DEFAULT false,
        "tomorrowWork" text,
        "tomorrowOnLeave" boolean NOT NULL DEFAULT false,
        "tomorrowHoliday" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_work_logs_userId_date" ON "work_logs" ("userId", "date")`);

    // Notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "body" text,
        "meta" jsonb,
        "read" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_userId" ON "notifications" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_read" ON "notifications" ("read")`);

    // Foreign Keys
    await queryRunner.query(`ALTER TABLE "work_logs" ADD CONSTRAINT "FK_work_logs_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "work_logs" DROP CONSTRAINT "FK_work_logs_userId"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "work_logs"`);
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(`DROP TABLE "cards"`);
    await queryRunner.query(`DROP TABLE "lists"`);
    await queryRunner.query(`DROP TABLE "boards"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TABLE "scheduled_meetings"`);
    await queryRunner.query(`DROP TABLE "meetings"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
