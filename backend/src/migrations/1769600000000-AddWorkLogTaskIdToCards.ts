import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWorkLogTaskIdToCards1769600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add workLogTaskId column to cards table
    await queryRunner.addColumn(
      'cards',
      new TableColumn({
        name: 'workLogTaskId',
        type: 'uuid',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove workLogTaskId column from cards table
    await queryRunner.dropColumn('cards', 'workLogTaskId');
  }
}
