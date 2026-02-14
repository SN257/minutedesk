import { AppDataSource } from '../data-source';

async function main() {
  await AppDataSource.initialize();
  const today = new Date().toISOString().split('T')[0];
  const rows: any[] = await AppDataSource.query(`
    SELECT id, "userId", date, "startTime", "endTime", center
    FROM meetings
    WHERE date = $1
    ORDER BY "startTime" ASC
  `, [today]);

  const now = new Date();
  console.log('Now:', now.toISOString());
  for (const r of rows) {
    const dt = new Date(`${r.date}T${r.startTime}`);
    const diffMs = dt.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);
    console.log({ id: r.id, userId: r.userId, center: r.center, startTime: r.startTime, dt: dt.toISOString(), diffMin });
  }
  await AppDataSource.destroy();
}

main().catch(err => { console.error(err); process.exit(1); });
