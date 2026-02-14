import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function clearOldNotifications() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'minutedesk',
    entities: ['dist/**/*.entity.js'],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Connected to database');

  try {
    // Delete all existing notifications (old schema)
    const result = await dataSource.query('DELETE FROM notifications WHERE meta IS NULL OR meta::text NOT LIKE \'%"type"%\'');
    console.log(`Deleted ${result[1]} old notifications`);
    
    console.log('Old notifications cleared successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

clearOldNotifications();
