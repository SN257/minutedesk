import { AppDataSource } from '../data-source';
import { Meeting } from '../meetings/meetings.entity';
import { ScheduledMeeting } from '../scheduled-meetings/scheduled-meetings.entity';

async function reassignUserData() {
  await AppDataSource.initialize();

  console.log('\n=== Current Data Distribution ===\n');

  // Check meetings
  const meetingStats = await AppDataSource.query(`
    SELECT u.email, u.name, COUNT(m.id) as meeting_count
    FROM users u
    LEFT JOIN meetings m ON u.id = m."userId"
    GROUP BY u.id, u.email, u.name
    ORDER BY meeting_count DESC
  `);

  console.log('Meetings by User:');
  meetingStats.forEach((stat: any) => {
    console.log(`  ${stat.email} (${stat.name}): ${stat.meeting_count} meetings`);
  });

  // Check scheduled meetings
  const scheduledStats = await AppDataSource.query(`
    SELECT u.email, u.name, COUNT(sm.id) as scheduled_count
    FROM users u
    LEFT JOIN scheduled_meetings sm ON u.id = sm."userId"
    GROUP BY u.id, u.email, u.name
    ORDER BY scheduled_count DESC
  `);

  console.log('\nScheduled Meetings by User:');
  scheduledStats.forEach((stat: any) => {
    console.log(`  ${stat.email} (${stat.name}): ${stat.scheduled_count} scheduled meetings`);
  });

  // Check boards
  const boardStats = await AppDataSource.query(`
    SELECT u.email, u.name, COUNT(b.id) as board_count
    FROM users u
    LEFT JOIN boards b ON u.id = b."userId"
    GROUP BY u.id, u.email, u.name
    ORDER BY board_count DESC
  `);

  console.log('\nBoards by User:');
  boardStats.forEach((stat: any) => {
    console.log(`  ${stat.email} (${stat.name}): ${stat.board_count} boards`);
  });

  // Check tasks
  const taskStats = await AppDataSource.query(`
    SELECT u.email, u.name, COUNT(t.id) as task_count
    FROM users u
    LEFT JOIN tasks t ON u.id = t."userId"
    GROUP BY u.id, u.email, u.name
    ORDER BY task_count DESC
  `);

  console.log('\nTasks by User:');
  taskStats.forEach((stat: any) => {
    console.log(`  ${stat.email} (${stat.name}): ${stat.task_count} tasks`);
  });

  console.log('\n=== Instructions ===');
  console.log('To reassign data to a specific user, you can run SQL like:');
  console.log('  UPDATE meetings SET "userId" = \'<target-user-id>\' WHERE "userId" = \'<source-user-id>\';');
  console.log('\nTo find a user ID, check the list above or query: SELECT id, email FROM users;');

  await AppDataSource.destroy();
}

reassignUserData().catch(console.error);
