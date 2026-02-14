import { AppDataSource } from '../data-source';

/**
 * Query to show recent task_assigned notifications from meeting minutes
 */
async function main() {
  await AppDataSource.initialize();
  
  const rows: any[] = await AppDataSource.query(`
    SELECT 
      n.id, 
      n."userId", 
      n.title, 
      n.body,
      n.meta,
      n."createdAt",
      u.name as "userName",
      u.email as "userEmail"
    FROM notifications n
    LEFT JOIN users u ON u.id = n."userId"
    WHERE n.meta->>'type' = 'task_assigned'
    ORDER BY n."createdAt" DESC
    LIMIT 10
  `);

  console.log(`\nRecent task_assigned notifications (${rows.length}):\n`);
  for (const r of rows) {
    console.log({
      id: r.id,
      userName: r.userName,
      userEmail: r.userEmail,
      title: r.title,
      cardId: r.meta?.cardId,
      createdAt: r.createdAt,
    });
  }

  await AppDataSource.destroy();
}

main().catch(err => { console.error(err); process.exit(1); });
