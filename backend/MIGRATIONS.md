# Database Migrations Guide

This project uses TypeORM migrations to manage database schema changes.

## Setup

The migration configuration is in `src/data-source.ts`. Make sure your `.env` file is configured with correct database credentials.

## Available Migration Commands

### Run Migrations
Apply all pending migrations to the database:
```bash
npm run migration:run
```

### Revert Last Migration
Undo the last executed migration:
```bash
npm run migration:revert
```

### Show Migration Status
See which migrations have been run:
```bash
npm run migration:show
```

### Generate a New Migration (Auto)
Automatically generate a migration based on entity changes:
```bash
npm run migration:generate src/migrations/MigrationName
```

### Create a New Migration (Manual)
Create an empty migration file to write custom SQL:
```bash
npm run migration:create src/migrations/MigrationName
```

## Initial Setup

1. **Create the database** (if not exists):
```sql
CREATE DATABASE minutedesk;
```

2. **Run the initial migration**:
```bash
npm run migration:run
```

This will create the `users` table with the following structure:
- `id` (UUID, Primary Key)
- `email` (Unique, Not Null)
- `password` (Not Null)
- `name` (Nullable)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

## Creating New Migrations

### Method 1: Auto-generate from Entity Changes

1. Modify your entity files (e.g., add a new column to `User` entity)
2. Run:
```bash
npm run migration:generate src/migrations/AddColumnToUser
```

TypeORM will detect the changes and create a migration file automatically.

### Method 2: Manual Migration

1. Create a new migration file:
```bash
npm run migration:create src/migrations/AddCustomIndex
```

2. Edit the generated file in `src/migrations/`:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomIndex1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Your migration code here
    await queryRunner.query(`
      CREATE INDEX idx_users_email ON users(email);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert changes
    await queryRunner.query(`
      DROP INDEX idx_users_email;
    `);
  }
}
```

3. Run the migration:
```bash
npm run migration:run
```

## Migration Best Practices

1. **Always test migrations** in development before running in production
2. **Write reversible migrations** - implement both `up()` and `down()` methods
3. **Run migrations before starting the app** in production
4. **Never modify executed migrations** - create a new one instead
5. **Keep migrations small** - one logical change per migration
6. **Backup your database** before running migrations in production

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Run migrations:
```bash
npm run migration:run
```

3. Start the application:
```bash
npm run start:prod
```

## Migration Files Location

- Source: `src/migrations/*.ts`
- Compiled: `dist/migrations/*.js`

## Troubleshooting

### Error: "relation already exists"
The table might already exist from `synchronize: true`. Either:
- Drop the table manually
- Comment out the table creation in the migration
- Start fresh with a new database

### Error: "Cannot find module"
Make sure you've installed dependencies:
```bash
npm install
```

### Migration not detected
Ensure:
- Migration file is in `src/migrations/` directory
- File follows naming convention: `{timestamp}-{Name}.ts`
- You've built the project: `npm run build`

## Current Migration Status

To check which migrations have been applied:
```bash
npm run migration:show
```

Output will show:
- `[X]` - Executed migrations
- `[ ]` - Pending migrations
