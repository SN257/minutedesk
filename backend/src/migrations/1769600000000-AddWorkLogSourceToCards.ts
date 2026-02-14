import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWorkLogSourceToCards1769600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'cards',
      new TableColumn({
        name: 'workLogDate',
        type: 'date',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('cards', 'workLogDate');
  }
}
