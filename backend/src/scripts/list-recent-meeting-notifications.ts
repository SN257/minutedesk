import { AppDataSource } from '../data-source';

async function main() {
  await AppDataSource.initialize();
  const rows: any[] = await AppDataSource.query(`
    SELECT id, "userId", title, body, meta, "createdAt"
    FROM notifications
    WHERE (meta->> 'type' = 'meeting_reminder')
       OR ("createdAt" >= NOW() - INTERVAL '30 minutes')
    ORDER BY "createdAt" DESC
    LIMIT 50
  `);

  console.log('Recent meeting-related notifications:');
  for (const r of rows) {
    console.log({ id: r.id, userId: r.userId, title: r.title, meta: r.meta, createdAt: r.createdAt });
  }

  await AppDataSource.destroy();
}

main().catch(err => { console.error(err); process.exit(1); });
