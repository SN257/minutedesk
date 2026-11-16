import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/tasks.entity';
import { Card } from '../boards/card.entity';
import { Meeting } from '../meetings/meetings.entity';
import { ScheduledMeeting } from '../scheduled-meetings/scheduled-meetings.entity';
import { WorkLog } from '../work-logs/work-log.entity';
import { Notification } from '../notifications/notification.entity';
import { ActivityLog } from './activity-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { addDaysToDateString, getZonedDateString } from '../common/timezone.util';

type Source = 'task' | 'card';
interface Item {
  id: string;
  title: string;
  dueDate: string | null;
  done: boolean;
  doneOn: string | null;
  source: Source;
  priority: string | null;
}
interface LogRow { date: string; leave: boolean; holiday: boolean; work: string | null }

export type ReminderKind = 'overdue_tasks' | 'worklog_missing' | 'custom';
export const REMINDER_KINDS: ReminderKind[] = ['overdue_tasks', 'worklog_missing', 'custom'];

const OWNER = 'COALESCE(c.assignee::text, b."userId"::text)';
const daysBetween = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);
const isWeekend = (d: string) => { const g = new Date(`${d}T00:00:00Z`).getUTCDay(); return g === 0 || g === 6; };
const niceDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Where each work item stands today. */
const classify = (it: Item, today: string) => {
  if (it.done) {
    if (!it.dueDate || !it.doneOn) return 'doneNoDue' as const;
    return it.doneOn < it.dueDate ? ('early' as const) : it.doneOn === it.dueDate ? ('onTime' as const) : ('late' as const);
  }
  return it.dueDate && it.dueDate < today ? ('overdue' as const) : ('pending' as const);
};

@Injectable()
export class AdminFollowupService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Card) private readonly cardRepo: Repository<Card>,
    @InjectRepository(Meeting) private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(ScheduledMeeting) private readonly scheduledRepo: Repository<ScheduledMeeting>,
    @InjectRepository(WorkLog) private readonly workLogRepo: Repository<WorkLog>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    @InjectRepository(ActivityLog) private readonly activityRepo: Repository<ActivityLog>,
    private readonly notifications: NotificationsService,
  ) {}

  /* ───────── loading ───────── */

  /** Every task and board card, grouped by the person it belongs to (one person when `userId` is given). */
  private async loadItems(userId?: string): Promise<Map<string, Item[]>> {
    const taskQb = this.taskRepo.createQueryBuilder('t')
      .select('t.id', 'id').addSelect('t."userId"', 'owner').addSelect('t.title', 'title')
      .addSelect(`to_char(t."dueDate", 'YYYY-MM-DD')`, 'dueDate').addSelect('t.completed', 'done')
      .addSelect(`to_char(t."completedAt", 'YYYY-MM-DD')`, 'doneOn');
    if (userId) taskQb.where('t."userId" = :userId', { userId });
    const cardQb = this.cardRepo.createQueryBuilder('c')
      .innerJoin('lists', 'l', 'l.id = c."listId"').innerJoin('boards', 'b', 'b.id = l."boardId"')
      .select('c.id', 'id').addSelect(OWNER, 'owner').addSelect('c.title', 'title')
      .addSelect(`to_char(c."dueDate", 'YYYY-MM-DD')`, 'dueDate').addSelect('c.archived', 'done')
      .addSelect(`to_char(c."archivedAt", 'YYYY-MM-DD')`, 'doneOn').addSelect('c.priority', 'priority');
    if (userId) cardQb.where(`${OWNER} = :userId`, { userId });

    const [tasks, cards] = await Promise.all([taskQb.getRawMany(), cardQb.getRawMany()]);
    const map = new Map<string, Item[]>();
    const add = (owner: string | null, source: Source, r: any) => {
      if (!owner) return;
      const list = map.get(owner) ?? [];
      list.push({ id: r.id, title: r.title, dueDate: r.dueDate || null, done: !!r.done, doneOn: r.doneOn || null, source, priority: r.priority ?? null });
      map.set(owner, list);
    };
    tasks.forEach((r) => add(r.owner, 'task', r));
    cards.forEach((r) => add(r.owner, 'card', r));
    return map;
  }

  private async loadLogs(userIds: string[] | null, since: string): Promise<Map<string, LogRow[]>> {
    const qb = this.workLogRepo.createQueryBuilder('w')
      .select('w."userId"', 'userId').addSelect(`to_char(w.date, 'YYYY-MM-DD')`, 'date')
      .addSelect('w."todayOnLeave"', 'leave').addSelect('w."todayHoliday"', 'holiday').addSelect('w."todayWork"', 'work')
      .where('w.date >= :since', { since });
    if (userIds) qb.andWhere('w."userId" IN (:...ids)', { ids: userIds.length ? userIds : [''] });
    const rows = await qb.getRawMany();
    const map = new Map<string, LogRow[]>();
    rows.forEach((r) => { const l = map.get(r.userId) ?? []; l.push({ date: r.date, leave: !!r.leave, holiday: !!r.holiday, work: r.work ?? null }); map.set(r.userId, l); });
    return map;
  }

  /** Working days (Mon to Fri) between two dates, after the person joined, that have no log of any kind. */
  private missedDays(from: string, to: string, joined: string, logged: Set<string>): string[] {
    const out: string[] = [];
    for (let d = from < joined ? joined : from; d <= to; d = addDaysToDateString(d, 1)) {
      if (!isWeekend(d) && !logged.has(d)) out.push(d);
    }
    return out;
  }

  /* ───────── the people list ───────── */

  async list() {
    const users = await this.userRepo.find({ order: { name: 'ASC' } });
    const [items, logs, lastRows] = await Promise.all([
      this.loadItems(),
      this.loadLogs(null, addDaysToDateString(getZonedDateString(new Date()), -35)),
      this.activityRepo.createQueryBuilder('a').select('a."userId"', 'userId').addSelect('MAX(a."createdAt")', 'last').where('a."userId" IS NOT NULL').groupBy('a."userId"').getRawMany(),
    ]);
    const last = new Map<string, string>(lastRows.map((r) => [r.userId, new Date(r.last).toISOString()]));

    return users.map((u) => {
      const today = getZonedDateString(new Date(), u.timezone);
      const mine = items.get(u.id) ?? [];
      const c = { overdue: 0, pending: 0, late: 0, done: 0 };
      mine.forEach((it) => {
        const k = classify(it, today);
        if (k === 'overdue') c.overdue++; else if (k === 'pending') c.pending++; else { c.done++; if (k === 'late') c.late++; }
      });
      const joined = getZonedDateString(u.createdAt, u.timezone);
      const logged = new Set((logs.get(u.id) ?? []).map((l) => l.date));
      const missed = this.missedDays(addDaysToDateString(today, -14), addDaysToDateString(today, -1), joined, logged).length;
      const lastLog = [...logged].sort().pop() ?? null;
      return {
        id: u.id, name: u.name ?? null, email: u.email, role: u.role,
        total: mine.length, overdue: c.overdue, pending: c.pending, doneLate: c.late, done: c.done,
        missedLogDays: missed, lastLogDate: lastLog, lastActive: last.get(u.id) ?? null,
      };
    });
  }

  /* ───────── one person ───────── */

  async detail(userId: string, monthParam?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;
    const today = getZonedDateString(new Date(), user.timezone);
    const joined = getZonedDateString(user.createdAt, user.timezone);
    const month = /^\d{4}-\d{2}$/.test(monthParam ?? '') ? (monthParam as string) : today.slice(0, 7);
    const monthStart = `${month}-01`;
    const [my, mm] = month.split('-').map(Number);
    const monthEnd = `${month}-${String(new Date(Date.UTC(my, mm, 0)).getUTCDate()).padStart(2, '0')}`;

    const [items, logsMap, meetingsTotal, meetingsInMonth, recentMeetings, upcoming, history, lastActive] = await Promise.all([
      this.loadItems(userId),
      this.loadLogs([userId], addDaysToDateString(today, -45) < monthStart ? addDaysToDateString(today, -45) : monthStart),
      this.meetingRepo.count({ where: { userId } }),
      this.meetingRepo.createQueryBuilder('m').where('m."userId" = :userId', { userId }).andWhere(`to_char(m.date, 'YYYY-MM') = :month`, { month }).getCount(),
      this.meetingRepo.createQueryBuilder('m').select('m.id', 'id').addSelect(`to_char(m.date, 'YYYY-MM-DD')`, 'date').addSelect('m."meetingType"', 'meetingType').addSelect('m.center', 'center').addSelect('m.place', 'place')
        .where('m."userId" = :userId', { userId }).orderBy('m.date', 'DESC').limit(8).getRawMany(),
      this.scheduledRepo.createQueryBuilder('s').select('s.id', 'id').addSelect(`to_char(s.date, 'YYYY-MM-DD')`, 'date').addSelect('s.startTime', 'startTime').addSelect('s.meetingType', 'meetingType').addSelect('s.center', 'center')
        .where('s."userId" = :userId', { userId }).andWhere('s.date >= :today', { today }).orderBy('s.date', 'ASC').limit(5).getRawMany(),
      this.notifRepo.createQueryBuilder('n').where('n."userId" = :userId', { userId }).andWhere(`n.meta->>'type' = 'admin_reminder'`).orderBy('n."createdAt"', 'DESC').limit(10).getMany(),
      this.activityRepo.createQueryBuilder('a').select('MAX(a."createdAt")', 'last').where('a."userId" = :userId', { userId }).getRawOne(),
    ]);

    /* work items */
    const mine = items.get(userId) ?? [];
    const buckets = { overdue: [] as any[], pending: [] as any[], doneLate: [] as any[], early: 0, onTime: 0, doneNoDue: 0 };
    mine.forEach((it) => {
      const k = classify(it, today);
      if (k === 'overdue') buckets.overdue.push({ ...it, daysOverdue: daysBetween(it.dueDate as string, today) });
      else if (k === 'pending') buckets.pending.push({ ...it, dueToday: it.dueDate === today });
      else if (k === 'late') buckets.doneLate.push({ ...it, daysLate: daysBetween(it.dueDate as string, it.doneOn as string) });
      else if (k === 'early') buckets.early++;
      else if (k === 'onTime') buckets.onTime++;
      else buckets.doneNoDue++;
    });
    buckets.overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
    buckets.pending.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
    buckets.doneLate.sort((a, b) => (b.doneOn ?? '').localeCompare(a.doneOn ?? ''));
    const doneTotal = buckets.early + buckets.onTime + buckets.doneLate.length;
    const tasks = {
      total: mine.length,
      done: doneTotal + buckets.doneNoDue,
      inTime: buckets.early + buckets.onTime,
      early: buckets.early,
      onTime: buckets.onTime,
      doneLate: buckets.doneLate.length,
      pending: buckets.pending.length,
      overdue: buckets.overdue.length,
      onTimeRate: doneTotal > 0 ? Math.round(((buckets.early + buckets.onTime) / doneTotal) * 100) : null,
      overdueList: buckets.overdue.slice(0, 50),
      pendingList: buckets.pending.slice(0, 30),
      doneLateList: buckets.doneLate.slice(0, 30),
    };

    /* work-log calendar for the chosen month */
    const logs = logsMap.get(userId) ?? [];
    const byDate = new Map(logs.map((l) => [l.date, l]));
    const days: { date: string; status: 'filled' | 'leave' | 'holiday' | 'missed' | 'today' | 'upcoming' | 'off' | 'before'; note?: string }[] = [];
    for (let d = monthStart; d <= monthEnd; d = addDaysToDateString(d, 1)) {
      const l = byDate.get(d);
      let status: (typeof days)[number]['status'];
      if (d < joined) status = 'before';
      else if (l) status = l.leave ? 'leave' : l.holiday ? 'holiday' : 'filled';
      else if (isWeekend(d)) status = 'off';
      else if (d > today) status = 'upcoming';
      else if (d === today) status = 'today';
      else status = 'missed';
      days.push({ date: d, status, ...(l?.work ? { note: l.work.slice(0, 160) } : {}) });
    }
    const count = (s: string) => days.filter((x) => x.status === s).length;
    const filled = count('filled'), leave = count('leave'), holiday = count('holiday'), missed = count('missed');
    const accounted = filled + leave + holiday + missed;

    const loggedAll = new Set(logs.map((l) => l.date));
    const missedRecent = this.missedDays(addDaysToDateString(today, -30), addDaysToDateString(today, -1), joined, loggedAll);
    const lastLog = logs.map((l) => l.date).sort().pop() ?? null;

    const view = {
      user: { id: user.id, name: user.name ?? null, email: user.email, role: user.role, timezone: user.timezone ?? null, createdAt: user.createdAt, lastActive: lastActive?.last ? new Date(lastActive.last).toISOString() : null },
      today,
      tasks,
      meetings: { total: meetingsTotal, inMonth: meetingsInMonth, recent: recentMeetings, upcoming },
      workLog: {
        month, days, filled, leave, holiday, missed,
        rate: accounted > 0 ? Math.round(((filled + leave + holiday) / accounted) * 100) : null,
        missedRecent: missedRecent.slice(-14), missedRecentCount: missedRecent.length, lastLogDate: lastLog,
      },
      reminders: history.map((n) => ({ id: n.id, title: n.title, body: n.body ?? null, kind: n.meta?.kind ?? 'custom', sentBy: n.meta?.sentBy ?? null, read: n.read, createdAt: n.createdAt })),
      defaults: {
        overdue_tasks: this.compose('overdue_tasks', buckets.overdue, []),
        worklog_missing: this.compose('worklog_missing', [], missedRecent),
      },
    };
    return view;
  }

  /* ───────── messages ───────── */

  private compose(kind: ReminderKind, overdue: any[], missed: string[]): { title: string; body: string } {
    if (kind === 'overdue_tasks') {
      const n = overdue.length;
      const lines = overdue.slice(0, 5).map((t) => `• ${t.title} (${t.daysOverdue} day${t.daysOverdue === 1 ? '' : 's'} overdue)`);
      if (n > 5) lines.push(`…and ${n - 5} more`);
      return {
        title: n === 1 ? '1 overdue task needs your attention' : `${n} overdue tasks need your attention`,
        body: `${lines.join('\n')}\n\nPlease complete them, or update the due date, as soon as you can.`,
      };
    }
    const shown = missed.slice(-7).map(niceDay);
    return {
      title: 'Please fill in your work log',
      body: `Your work log is missing for ${missed.length} working day${missed.length === 1 ? '' : 's'}: ${shown.join(', ')}${missed.length > 7 ? ' and earlier' : ''}.\n\nPlease fill it in today.`,
    };
  }

  /** Sends a reminder as an in-app notification (and an email, if the person has email on). */
  async remind(userId: string, kind: ReminderKind, custom: { title?: string; message?: string }, sentBy: { name?: string | null; email?: string | null }) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    let message: { title: string; body: string };
    if (kind === 'custom') {
      const body = (custom.message ?? '').trim();
      if (!body) throw new HttpException('Write a message first', HttpStatus.BAD_REQUEST);
      if (body.length > 1000) throw new HttpException('Keep the message under 1000 characters', HttpStatus.BAD_REQUEST);
      message = { title: (custom.title ?? '').trim().slice(0, 120) || 'A message from your admin', body };
    } else if (kind === 'overdue_tasks') {
      const today = getZonedDateString(new Date(), user.timezone);
      const overdue = ((await this.loadItems(userId)).get(userId) ?? [])
        .filter((it) => classify(it, today) === 'overdue')
        .map((it) => ({ ...it, daysOverdue: daysBetween(it.dueDate as string, today) }))
        .sort((a, b) => b.daysOverdue - a.daysOverdue);
      if (!overdue.length) throw new HttpException('This person has no overdue tasks', HttpStatus.BAD_REQUEST);
      message = this.compose(kind, overdue, []);
    } else {
      const today = getZonedDateString(new Date(), user.timezone);
      const joined = getZonedDateString(user.createdAt, user.timezone);
      const logs = (await this.loadLogs([userId], addDaysToDateString(today, -31))).get(userId) ?? [];
      const missed = this.missedDays(addDaysToDateString(today, -30), addDaysToDateString(today, -1), joined, new Set(logs.map((l) => l.date)));
      if (!missed.length) throw new HttpException('This person has no missed work-log days', HttpStatus.BAD_REQUEST);
      message = this.compose(kind, [], missed);
    }

    // The same kind of reminder is held back for two minutes, so a double click never sends it twice.
    const recent = await this.notifRepo.createQueryBuilder('n')
      .where('n."userId" = :userId', { userId }).andWhere(`n.meta->>'type' = 'admin_reminder'`).andWhere(`n.meta->>'kind' = :kind`, { kind })
      .andWhere(`n."createdAt" > now() - interval '2 minutes'`).getCount();
    if (recent > 0 && kind !== 'custom') throw new HttpException('You just sent this reminder. Give it a moment.', HttpStatus.TOO_MANY_REQUESTS);

    const sent = await this.notifications.createForUser(userId, message.title, message.body, {
      type: 'admin_reminder', category: 'Reminder', kind, sentBy: sentBy.name || sentBy.email || 'An admin', nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    return { ok: true, id: sent?.id ?? null, title: message.title, body: message.body };
  }
}
