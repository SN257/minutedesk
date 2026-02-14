import { AppDataSource } from '../data-source';

const TARGET_MEETING_ID = '751bf9d3-0c01-415d-b22b-00f6c2f24051';

function formatLocalDate(raw: any) {
  if (!raw) return null;
  if (raw instanceof Date) {
    const d = raw as Date;
    const y = d.getFullYear();
    const m = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${y}-${m}-${day}`;
  }
  // if string like ISO or date-only
  const s = String(raw);
  return s.split('T')[0];
}

async function main() {
  await AppDataSource.initialize();

  // try scheduled_meetings first
  let rows: any[] = await AppDataSource.query(
    `SELECT id, "userId", date, start_time as "startTime", center FROM scheduled_meetings WHERE id = $1`,
    [TARGET_MEETING_ID]
  );

  if (!rows || rows.length === 0) {
    rows = await AppDataSource.query(
      `SELECT id, "userId", date, "startTime", center FROM meetings WHERE id = $1`,
      [TARGET_MEETING_ID]
    );
  }

  if (!rows || rows.length === 0) {
    console.error('Meeting not found:', TARGET_MEETING_ID);
    await AppDataSource.destroy();
    process.exit(1);
  }

  const m = rows[0];
  const dateStr = formatLocalDate(m.date);
  const startTime = m.startTime;
  const title = `Meeting starts in 15 minutes: ${m.center || 'Meeting'}`;
  const body = `Your meeting at ${startTime} on ${dateStr} starts in ~15 minutes.`;

  // check existing notification
  const exists = await AppDataSource.query(
    `SELECT id FROM notifications WHERE meta->> 'type' = 'meeting_reminder' AND meta->> 'meetingId' = $1 AND "userId" = $2 LIMIT 1`,
    [m.id, m.userId]
  );

  if (exists && exists.length > 0) {
    console.log('Reminder already exists for meeting:', m.id);
    await AppDataSource.destroy();
    process.exit(0);
  }

  const meta = JSON.stringify({ meetingId: m.id, type: 'meeting_reminder', category: 'Reminder', date: dateStr, startTime });

  await AppDataSource.query(
    `INSERT INTO notifications ("userId", title, body, meta, read, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::jsonb, false, NOW(), NOW())`,
    [m.userId, title, body, meta]
  );

  console.log('Inserted meeting reminder for', m.id, 'user', m.userId);
  await AppDataSource.destroy();
}

main().catch(err => { console.error(err); process.exit(1); });
