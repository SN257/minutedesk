import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateNotificationsTable1769800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'notifications',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
        { name: 'userId', type: 'uuid' },
        { name: 'title', type: 'varchar' },
        { name: 'body', type: 'text', isNullable: true },
        { name: 'meta', type: 'jsonb', isNullable: true },
        { name: 'read', type: 'boolean', default: false },
        { name: 'createdAt', type: 'timestamp', default: 'now()' },
      ],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications');
  }
}
