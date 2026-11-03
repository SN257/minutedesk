import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_CENTERS = [
  'NA Head Center', 'ATLANTA', 'BOSTON', 'CHICAGO', 'CHERRY HILL', 'EDISON', 'Jercy City',
  'SAN FRANCISCO', 'Oak Forest', 'Fayetteville', 'Dallas', 'Cleveland', 'Toronto', 'Brampton',
  'Windsor', 'Ottawa', 'KWCG', 'Hamilton', 'Edmonton', 'Regina', 'Calgary', 'London',
  'Etobicoke', 'Scarborough',
];

export class AddCentersAndRoles1787000000000 implements MigrationInterface {
  name = 'AddCentersAndRoles1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "centers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_centers_name" UNIQUE ("name"),
        CONSTRAINT "PK_centers_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying NOT NULL,
        "label" character varying NOT NULL,
        "description" text,
        "isSystem" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_key" UNIQUE ("key"),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id")
      )
    `);

    for (const name of DEFAULT_CENTERS) {
      await queryRunner.query(`INSERT INTO "centers" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING`, [name]);
    }

    await queryRunner.query(
      `INSERT INTO "roles" ("key", "label", "description", "isSystem") VALUES ($1, $2, $3, true) ON CONFLICT ("key") DO NOTHING`,
      ['user', 'User', 'Standard access — manage own data across all modules.'],
    );
    await queryRunner.query(
      `INSERT INTO "roles" ("key", "label", "description", "isSystem") VALUES ($1, $2, $3, true) ON CONFLICT ("key") DO NOTHING`,
      ['super_admin', 'Super Admin', 'Full platform access, including the Admin Center.'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "centers"`);
  }
}
