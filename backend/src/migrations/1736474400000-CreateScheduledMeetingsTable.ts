import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateScheduledMeetingsTable1736474400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'scheduled_meetings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'start_time',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'end_time',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'meeting_type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'center',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'participants',
            type: 'int',
            default: 3,
          },
          {
            name: 'agenda',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create index on date for faster queries
    await queryRunner.query(
      `CREATE INDEX "IDX_scheduled_meetings_date" ON "scheduled_meetings" ("date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('scheduled_meetings');
  }
}
