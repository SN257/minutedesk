import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import { Pool } from 'pg';
import { Repository, In } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications/notifications.service';
import { User } from './users/entities/user.entity';
import { WorkLog } from './work-logs/work-log.entity';
import { Task } from './tasks/tasks.entity';
import { Meeting } from './meetings/meetings.entity';
import { getZonedDateString, getZonedHourMinute, addDaysToDateString, zonedTimeToUtc } from './common/timezone.util';

// Hour (in each user's own local timezone) at which daily reminder emails go out.
const REMINDER_HOUR = 7;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  const envCors = process.env.CORS_ORIGIN || '';
  const corsOrigin = envCors.trim() === '*'
    ? true
    : [
        'http://localhost:5173',
        ...envCors.split(',').map((o) => o.trim()).filter((o) => o)
      ];

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Session configuration
  // Prefer a persistent session store (Postgres) so sessions survive server restarts.
  let store: any = undefined;
  try {
    // Use require so project can still run if package isn't installed yet.
    // Install with: npm install connect-pg-simple
    // connect-pg-simple expects the 'pg' Pool instance.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const connectPgSimple = require('connect-pg-simple');
    const PgSession = connectPgSimple(session);
    const poolConfig = process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT, 10) || 5432,
          user: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'minutedesk',
          ssl: process.env.DB_SSL === 'false' ? false : undefined,
        };
    const pool = new Pool(poolConfig);
    store = new PgSession({ pool, tableName: 'session', createTableIfMissing: true });
    console.log('Using Postgres session store for express-session');
  } catch (err) {
    console.warn('connect-pg-simple not available, falling back to in-memory session store. Install connect-pg-simple to persist sessions across restarts.');
  }

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      store: store as any,
      proxy: true,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: true, // Always true for cross-origin
        sameSite: 'none', // Always 'none' for cross-origin
      },
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);

  // Schedule daily worklog/task reminders at REMINDER_HOUR in each user's own local time
  const notifSvc = app.get(NotificationsService);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const workLogRepo = app.get<Repository<WorkLog>>(getRepositoryToken(WorkLog));
  const taskRepo = app.get<Repository<Task>>(getRepositoryToken(Task));
  const meetingRepo = app.get<Repository<Meeting>>(getRepositoryToken(Meeting));

  // Ticking at a fixed hourly cadence means, for any user's fixed UTC offset
  // (including fractional ones like UTC+5:30), exactly one tick per day lands
  // within their local REMINDER_HOUR — so gating on the hour alone is enough
  // to send each of these once a day, on each user's own clock.
  const isReminderHourFor = (timezone?: string) => getZonedHourMinute(new Date(), timezone).hour === REMINDER_HOUR;

  const runWorklogReminders = async () => {
    try {
      const users = await userRepo.find();
      for (const u of users) {
        try {
          if (!isReminderHourFor(u.timezone)) continue;
          const dateStr = getZonedDateString(new Date(), u.timezone);
          const existing = await workLogRepo.findOne({ where: { userId: u.id, date: dateStr } });
          if (!existing) {
            await notifSvc.createForUser(u.id, 'Submit your daily work log', "Please submit today's work log.", { type: 'daily_worklog_reminder', date: dateStr });
            console.log('[worklog-reminder] created for', u.email || u.id);
          }
        } catch (e) {
          console.error('[worklog-reminder] failed for user', u.id, e);
        }
      }
    } catch (e) {
      console.error('[worklog-reminder] failed', e);
    }
  };

  const runTaskReminders = async () => {
    try {
      const tasks = await taskRepo.createQueryBuilder('t').where('t.completed = false').andWhere('t.dueDate IS NOT NULL').getMany();
      const taskUserIds = [...new Set(tasks.map(t => t.userId))];
      const taskUsers = taskUserIds.length ? await userRepo.find({ where: { id: In(taskUserIds) } }) : [];
      const usersById = new Map(taskUsers.map(u => [u.id, u]));
      for (const t of tasks) {
        try {
          const due = t.dueDate;
          if (!due) continue;
          const user = usersById.get(t.userId);
          if (!isReminderHourFor(user?.timezone)) continue;
          const todayStr = getZonedDateString(new Date(), user?.timezone);
          if (due === todayStr) {
            await notifSvc.createForUser(t.userId, `Task due today: ${t.title}`, t.description || '', { type: 'task_due_today', taskId: t.id });
          } else if (due < todayStr) {
            await notifSvc.createForUser(t.userId, `Task overdue: ${t.title}`, t.description || '', { type: 'task_overdue', taskId: t.id });
          }
        } catch (e) {
          console.error('[task-reminder] failed for task', t.id, e);
        }
      }
    } catch (e) {
      console.error('[task-reminder] failed', e);
    }
  };

  // A fixed 1-hour cadence keeps each user's local-hour check phase-stable, so
  // this alone is enough to fire each reminder once a day per user (see above).
  runWorklogReminders();
  runTaskReminders();
  setInterval(runWorklogReminders, 60 * 60 * 1000);
  setInterval(runTaskReminders, 60 * 60 * 1000);

  // Meeting reminders: check every 5 minutes for scheduled meetings starting within the next hour
  const runMeetingReminders = async () => {
    try {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      // Coarse UTC-based date window just to narrow the SQL query; the exact
      // start-time comparison below is redone precisely per-meeting using each
      // meeting owner's own timezone.
      const dateCandidates = [-1, 0, 1].map(offset => addDaysToDateString(now.toISOString().split('T')[0], offset));
      const meetings = await meetingRepo.createQueryBuilder('m')
        .where('m.date IN (:...dates)', { dates: dateCandidates })
        .andWhere('m.scheduledMeetingId IS NOT NULL')
        .getMany();
      const meetingUserIds = [...new Set(meetings.map(m => m.userId))];
      const meetingUsers = meetingUserIds.length ? await userRepo.find({ where: { id: In(meetingUserIds) } }) : [];
      const usersById = new Map(meetingUsers.map(u => [u.id, u]));
      for (const m of meetings) {
        try {
          const ownerTimezone = usersById.get(m.userId)?.timezone;
          const start = zonedTimeToUtc(m.date, m.startTime, ownerTimezone);
          if (start.getTime() > now.getTime() && start.getTime() <= inOneHour.getTime()) {
            await notifSvc.createForUser(m.userId, `Meeting starting soon: ${m.meetingType || 'Meeting'}`, `Starts at ${m.startTime}`, { type: 'meeting_reminder', meetingId: m.id });
          }
        } catch (e) {
          console.error('[meeting-reminder] failed for meeting', m.id, e);
        }
      }
    } catch (e) {
      console.error('[meeting-reminder] failed', e);
    }
  };

  setInterval(runMeetingReminders, 5 * 60 * 1000);
}
bootstrap();
