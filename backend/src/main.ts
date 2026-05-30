import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import { Pool } from 'pg';
import { AppDataSource } from './data-source';
import { NotificationsService } from './notifications/notifications.service';
import { User } from './users/entities/user.entity';
import { WorkLog } from './work-logs/work-log.entity';
import { Task } from './tasks/tasks.entity';
import { Meeting } from './meetings/meetings.entity';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  const envCors = process.env.CORS_ORIGIN || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'https://minutedesk.vercel.app',
    ...envCors.split(',').map((o) => o.trim()).filter((o) => o)
  ];

  app.enableCors({
    origin: allowedOrigins,
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

  // Schedule daily worklog reminders at 07:00 server time
  const notifSvc = app.get(NotificationsService);

  const runWorklogReminders = async () => {
    try {
      if (!AppDataSource.isInitialized) await AppDataSource.initialize();
      const userRepo = AppDataSource.getRepository(User);
      const workLogRepo = AppDataSource.getRepository(WorkLog);
      const users = await userRepo.find();
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      for (const u of users) {
        try {
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

  const scheduleDailyAt = (hour = 7, minute = 0) => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const msUntilNext = next.getTime() - now.getTime();
    setTimeout(() => {
      runWorklogReminders();
      setInterval(runWorklogReminders, 24 * 60 * 60 * 1000);
    }, msUntilNext);
    console.log(`[worklog-reminder] scheduled first run in ${Math.round(msUntilNext / 1000)}s`);
  };

  scheduleDailyAt(7, 0);

  // Schedule daily task due reminders at 07:00 as well
  const runTaskReminders = async () => {
    try {
      if (!AppDataSource.isInitialized) await AppDataSource.initialize();
      const taskRepo = AppDataSource.getRepository(Task);
      const tasks = await taskRepo.createQueryBuilder('t').where('t.completed = false').andWhere('t.dueDate IS NOT NULL').getMany();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      for (const t of tasks) {
        try {
          const due = t.dueDate;
          if (!due) continue;
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

  scheduleDailyAt(7, 0);

  // Meeting reminders: check every 5 minutes for meetings starting within the next hour
  const runMeetingReminders = async () => {
    try {
      if (!AppDataSource.isInitialized) await AppDataSource.initialize();
      const meetingRepo = AppDataSource.getRepository(Meeting);
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      // Find meetings with start datetime between now and next hour
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` + `-${String(now.getDate()).padStart(2, '0')}`;
      const meetings = await meetingRepo.createQueryBuilder('m').where('m.date = :d', { d: todayStr }).getMany();
      for (const m of meetings) {
        try {
          const start = new Date(`${m.date}T${m.startTime}`);
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
