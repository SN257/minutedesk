import { AppDataSource } from '../data-source';

function localDateStr(d: Date) {
  const y = d.getFullYear();
  const m = ('0' + (d.getMonth() + 1)).slice(-2);
  const day = ('0' + d.getDate()).slice(-2);
  return `${y}-${m}-${day}`;
}

function timeStr(d: Date) {
  const hh = ('0' + d.getHours()).slice(-2);
  const mm = ('0' + d.getMinutes()).slice(-2);
  return `${hh}:${mm}`;
}

async function main() {
  await AppDataSource.initialize();
  const now = new Date();
  const lower = new Date(now.getTime() - 90 * 60 * 1000);
  const upper = new Date(now.getTime() + 90 * 60 * 1000);
  const dates = [
    localDateStr(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    localDateStr(now),
    localDateStr(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
  ];
  const lowerStr = timeStr(lower);
  const upperStr = timeStr(upper);

  console.log('Now (local):', now.toString());
  console.log('Searching dates:', dates, 'time window:', lowerStr, '->', upperStr);

  const meetings = await AppDataSource.query(
    `SELECT id, "userId", date, "startTime", center FROM meetings WHERE date IN ($1,$2,$3) AND "startTime" BETWEEN $4 AND $5 ORDER BY date, "startTime"`,
    dates.concat([lowerStr, upperStr])
  );

  const scheduled = await AppDataSource.query(
    `SELECT id, "userId", date, start_time as "startTime", center FROM scheduled_meetings WHERE date IN ($1,$2,$3) AND start_time BETWEEN $4 AND $5 ORDER BY date, start_time`,
    dates.concat([lowerStr, upperStr])
  );

  console.log('\nMeetings:');
  console.dir(meetings, { depth: null });
  console.log('\nScheduled Meetings:');
  console.dir(scheduled, { depth: null });

  // compute dt and diff to now+15min for each scheduled meeting (same logic as notifications)
  const in15 = new Date(now.getTime() + 15 * 60 * 1000);
  for (const s of scheduled) {
    const rawDate = s.date;
    let dateStr = String(rawDate);
    if (rawDate && rawDate instanceof Date) {
      const d = rawDate as Date;
      const y = d.getFullYear();
      const m = ('0' + (d.getMonth() + 1)).slice(-2);
      const day = ('0' + d.getDate()).slice(-2);
      dateStr = `${y}-${m}-${day}`;
    }
    const startTime = s.startTime;
    const dt = new Date(`${dateStr}T${startTime}`);
    console.log('Scheduled:', s.id, 'dateStr=', dateStr, 'startTime=', startTime, 'dt=', dt.toString(), 'diffMin=', Math.round((dt.getTime() - in15.getTime())/60000));
  }

  await AppDataSource.destroy();
}

main().catch(err => { console.error(err); process.exit(1); });
