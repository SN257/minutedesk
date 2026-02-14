import { AppDataSource } from '../data-source';

async function reassignToSiddhant() {
  await AppDataSource.initialize();

  console.log('\n=== Reassigning All Data to sidzt186@gmail.com ===\n');

  // Get Siddhant's user ID
  const [user] = await AppDataSource.query(`
    SELECT id, email, name FROM users WHERE email = 'sidzt186@gmail.com'
  `);

  if (!user) {
    console.log('❌ User sidzt186@gmail.com not found');
    await AppDataSource.destroy();
    return;
  }

  console.log(`Target user: ${user.email} (${user.name})`);
  console.log(`User ID: ${user.id}\n`);

  // Count current data
  const [meetingCount] = await AppDataSource.query(`
    SELECT COUNT(*) as count FROM meetings
  `);
  const [scheduledCount] = await AppDataSource.query(`
    SELECT COUNT(*) as count FROM scheduled_meetings
  `);
  const [boardCount] = await AppDataSource.query(`
    SELECT COUNT(*) as count FROM boards
  `);
  const [taskCount] = await AppDataSource.query(`
    SELECT COUNT(*) as count FROM tasks
  `);

  console.log('Data to reassign:');
  console.log(`  - ${meetingCount.count} meetings`);
  console.log(`  - ${scheduledCount.count} scheduled meetings`);
  console.log(`  - ${boardCount.count} boards`);
  console.log(`  - ${taskCount.count} tasks\n`);

  // Reassign all data
  await AppDataSource.query(`UPDATE meetings SET "userId" = $1`, [user.id]);
  console.log(`✓ Reassigned meetings`);

  await AppDataSource.query(`UPDATE scheduled_meetings SET "userId" = $1`, [user.id]);
  console.log(`✓ Reassigned scheduled meetings`);

  await AppDataSource.query(`UPDATE boards SET "userId" = $1`, [user.id]);
  console.log(`✓ Reassigned boards`);

  await AppDataSource.query(`UPDATE tasks SET "userId" = $1`, [user.id]);
  console.log(`✓ Reassigned tasks`);

  console.log(`\n✅ All data has been reassigned to ${user.email}`);
  console.log('\nLog in with sidzt186@gmail.com to see all your data.');

  await AppDataSource.destroy();
}

reassignToSiddhant().catch(console.error);
