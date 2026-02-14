import { AppDataSource } from '../data-source';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function reassignAllData() {
  await AppDataSource.initialize();

  console.log('\n=== Reassign All Data to Your User ===\n');

  // Get all users
  const users = await AppDataSource.query(`
    SELECT id, email, name FROM users ORDER BY email
  `);

  console.log('Available users:');
  users.forEach((user: any, idx: number) => {
    console.log(`  ${idx + 1}. ${user.email} (${user.name || 'No name'}) - ID: ${user.id}`);
  });

  const targetIdx = await question('\nEnter the number of the user who should own ALL data: ');
  const targetUser = users[parseInt(targetIdx) - 1];

  if (!targetUser) {
    console.log('Invalid selection');
    rl.close();
    await AppDataSource.destroy();
    return;
  }

  console.log(`\n⚠️  You are about to reassign ALL data to: ${targetUser.email}`);
  const confirm = await question('Type "yes" to confirm: ');

  if (confirm.toLowerCase() !== 'yes') {
    console.log('Operation cancelled');
    rl.close();
    await AppDataSource.destroy();
    return;
  }

  console.log('\nReassigning data...');

  // Reassign meetings
  const meetingResult = await AppDataSource.query(`
    UPDATE meetings SET "userId" = $1
  `, [targetUser.id]);
  console.log(`✓ Updated meetings`);

  // Reassign scheduled meetings
  const scheduledResult = await AppDataSource.query(`
    UPDATE scheduled_meetings SET "userId" = $1
  `, [targetUser.id]);
  console.log(`✓ Updated scheduled meetings`);

  // Reassign boards
  const boardResult = await AppDataSource.query(`
    UPDATE boards SET "userId" = $1
  `, [targetUser.id]);
  console.log(`✓ Updated boards`);

  // Reassign tasks
  const taskResult = await AppDataSource.query(`
    UPDATE tasks SET "userId" = $1
  `, [targetUser.id]);
  console.log(`✓ Updated tasks`);

  console.log(`\n✅ All data has been reassigned to ${targetUser.email}`);
  console.log('\nYou can now log in with this account to see all your data.');

  rl.close();
  await AppDataSource.destroy();
}

reassignAllData().catch(console.error);
