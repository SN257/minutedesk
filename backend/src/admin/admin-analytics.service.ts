import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Meeting } from '../meetings/meetings.entity';
import { Card } from '../boards/card.entity';
import { Task } from '../tasks/tasks.entity';
import { WorkLog } from '../work-logs/work-log.entity';
import { ActivityLog } from './activity-log.entity';
import { addDaysToDateString, getZonedDateString, countWeekdays } from '../common/timezone.util';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Meeting) private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(Card) private readonly cardRepo: Repository<Card>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(WorkLog) private readonly workLogRepo: Repository<WorkLog>,
    @InjectRepository(ActivityLog) private readonly activityLogRepo: Repository<ActivityLog>,
  ) {}

  async overview() {
    const [totalUsers, superAdmins, totalMeetings, totalCards, archivedCards, totalTasks, totalWorkLogs] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { role: 'super_admin' } }),
      this.meetingRepo.count(),
      this.cardRepo.count(),
      this.cardRepo.count({ where: { archived: true } }),
      this.taskRepo.count(),
      this.workLogRepo.count(),
    ]);

    const today = getZonedDateString(new Date());
    const sevenDaysAgo = addDaysToDateString(today, -7);
    const thirtyDaysAgo = addDaysToDateString(today, -30);

    const [activeUsers7d, activeUsers30d] = await Promise.all([
      this.activityLogRepo
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a."userId")', 'count')
        .where('a."createdAt" >= :since', { since: sevenDaysAgo })
        .andWhere('a."userId" IS NOT NULL')
        .getRawOne(),
      this.activityLogRepo
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a."userId")', 'count')
        .where('a."createdAt" >= :since', { since: thirtyDaysAgo })
        .andWhere('a."userId" IS NOT NULL')
        .getRawOne(),
    ]);

    return {
      totalUsers,
      superAdmins,
      totalMeetings,
      totalCards,
      activeCards: totalCards - archivedCards,
      archivedCards,
      totalTasks,
      totalWorkLogs,
      activeUsers7d: Number(activeUsers7d?.count || 0),
      activeUsers30d: Number(activeUsers30d?.count || 0),
    };
  }

  // Daily counts for the last N days: new signups, meetings created, cards created.
  async trends(days = 30) {
    const today = getZonedDateString(new Date());
    const dayList = Array.from({ length: days }, (_, i) => addDaysToDateString(today, -(days - 1 - i)));

    const [signupRows, meetingRows, cardRows] = await Promise.all([
      this.userRepo
        .createQueryBuilder('u')
        .select("to_char(u.\"createdAt\", 'YYYY-MM-DD')", 'day')
        .addSelect('COUNT(*)', 'count')
        .where('u."createdAt" >= :since', { since: dayList[0] })
        .groupBy('day')
        .getRawMany(),
      this.meetingRepo
        .createQueryBuilder('m')
        .select('m.date', 'day')
        .addSelect('COUNT(*)', 'count')
        .where('m.date >= :since', { since: dayList[0] })
        .groupBy('m.date')
        .getRawMany(),
      this.cardRepo
        .createQueryBuilder('c')
        .select("to_char(c.\"createdAt\", 'YYYY-MM-DD')", 'day')
        .addSelect('COUNT(*)', 'count')
        .where('c."createdAt" >= :since', { since: dayList[0] })
        .groupBy('day')
        .getRawMany(),
    ]);

    const toMap = (rows: any[]) => new Map(rows.map((r) => [String(r.day).slice(0, 10), Number(r.count)]));
    const signups = toMap(signupRows);
    const meetings = toMap(meetingRows);
    const cards = toMap(cardRows);

    return dayList.map((day) => ({
      day,
      signups: signups.get(day) || 0,
      meetings: meetings.get(day) || 0,
      cards: cards.get(day) || 0,
    }));
  }

  // Distribution breakdowns for the analytics page's pie/bar charts.
  async breakdowns() {
    const [meetingTypeRows, taskPriorityRows] = await Promise.all([
      this.meetingRepo
        .createQueryBuilder('m')
        .select("COALESCE(NULLIF(m.\"meetingType\", ''), 'Unspecified')", 'label')
        .addSelect('COUNT(*)', 'count')
        .groupBy('label')
        .getRawMany(),
      this.cardRepo
        .createQueryBuilder('c')
        .select("COALESCE(NULLIF(c.priority, ''), 'None')", 'label')
        .addSelect('COUNT(*)', 'count')
        .where('c.archived = false')
        .groupBy('label')
        .getRawMany(),
    ]);

    return {
      meetingTypes: meetingTypeRows.map((r) => ({ label: r.label, count: Number(r.count) })),
      taskPriorities: taskPriorityRows.map((r) => ({ label: r.label, count: Number(r.count) })),
    };
  }

  async topActiveUsers(limit = 10) {
    const rows = await this.activityLogRepo
      .createQueryBuilder('a')
      .select('a."userId"', 'userId')
      .addSelect('a."userEmail"', 'userEmail')
      .addSelect('COUNT(*)', 'actionCount')
      .where('a."userId" IS NOT NULL')
      .groupBy('a."userId"')
      .addGroupBy('a."userEmail"')
      .orderBy('"actionCount"', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((r) => ({ userId: r.userId, userEmail: r.userEmail, actionCount: Number(r.actionCount) }));
  }

  // One row per user with per-category counts, for the User Activity page's picker list.
  // A board card belongs to its assignee, or to the board's owner when nobody is assigned.
  private static readonly CARD_OWNER = 'COALESCE(c.assignee::text, b."userId"::text)';
  private ownedCards() {
    return this.cardRepo
      .createQueryBuilder('c')
      .innerJoin('lists', 'l', 'l.id = c."listId"')
      .innerJoin('boards', 'b', 'b.id = l."boardId"');
  }

  async usersOverview() {
    const users = await this.userRepo.find({ order: { createdAt: 'ASC' } });
    const today = getZonedDateString(new Date());

    const [meetingRows, taskRows, taskTimelinessRows, cardRows, cardDoneRows, cardTimelinessRows, workLogRows, recentLogRows, lastActiveRows] = await Promise.all([
      this.meetingRepo.createQueryBuilder('m').select('m."userId"', 'userId').addSelect('COUNT(*)', 'count').groupBy('m."userId"').getRawMany(),
      this.taskRepo
        .createQueryBuilder('t')
        .select('t."userId"', 'userId')
        .addSelect('COUNT(*)', 'count')
        .addSelect('COUNT(*) FILTER (WHERE t.completed = true)', 'completedCount')
        .groupBy('t."userId"')
        .getRawMany(),
      this.taskRepo
        .createQueryBuilder('t')
        .select('t."userId"', 'userId')
        .addSelect('COUNT(*) FILTER (WHERE t."completedAt"::date < t."dueDate")', 'early')
        .addSelect('COUNT(*) FILTER (WHERE t."completedAt"::date = t."dueDate")', 'onTime')
        .addSelect('COUNT(*) FILTER (WHERE t."completedAt"::date > t."dueDate")', 'late')
        .where('t.completed = true')
        .andWhere('t."completedAt" IS NOT NULL')
        .andWhere('t."dueDate" IS NOT NULL')
        .groupBy('t."userId"')
        .getRawMany(),
      this.ownedCards().select(AdminAnalyticsService.CARD_OWNER, 'userId').addSelect('COUNT(*)', 'count').groupBy(AdminAnalyticsService.CARD_OWNER).getRawMany(),
      this.ownedCards().select(AdminAnalyticsService.CARD_OWNER, 'userId').addSelect('COUNT(*)', 'count').where('c.archived = true').groupBy(AdminAnalyticsService.CARD_OWNER).getRawMany(),
      this.ownedCards()
        .select(AdminAnalyticsService.CARD_OWNER, 'userId')
        .addSelect('COUNT(*) FILTER (WHERE c."archivedAt"::date < c."dueDate")', 'early')
        .addSelect('COUNT(*) FILTER (WHERE c."archivedAt"::date = c."dueDate")', 'onTime')
        .addSelect('COUNT(*) FILTER (WHERE c."archivedAt"::date > c."dueDate")', 'late')
        .where('c.archived = true')
        .andWhere('c."archivedAt" IS NOT NULL')
        .andWhere('c."dueDate" IS NOT NULL')
        .groupBy(AdminAnalyticsService.CARD_OWNER)
        .getRawMany(),
      this.workLogRepo.createQueryBuilder('w').select('w."userId"', 'userId').addSelect('COUNT(*)', 'count').groupBy('w."userId"').getRawMany(),
      this.workLogRepo.createQueryBuilder('w').select('w."userId"', 'userId').addSelect(`to_char(w.date, 'YYYY-MM-DD')`, 'date').where('w.date >= :since', { since: addDaysToDateString(today, -35) }).getRawMany(),
      this.activityLogRepo
        .createQueryBuilder('a')
        .select('a."userId"', 'userId')
        .addSelect('MAX(a."createdAt")', 'lastActive')
        .where('a."userId" IS NOT NULL')
        .groupBy('a."userId"')
        .getRawMany(),
    ]);

    const recentLogs = new Map<string, Set<string>>();
    recentLogRows.forEach((r) => { const set = recentLogs.get(r.userId) ?? new Set<string>(); set.add(r.date); recentLogs.set(r.userId, set); });
    const countMap = (rows: any[]) => new Map(rows.map((r) => [r.userId, Number(r.count)]));
    const meetingsMap = countMap(meetingRows);
    const cardsMap = countMap(cardRows);
    const cardsDoneMap = countMap(cardDoneRows);
    const workLogsMap = countMap(workLogRows);
    const taskMap = new Map(taskRows.map((r) => [r.userId, { count: Number(r.count), completed: Number(r.completedCount) }]));
    const lastActiveMap = new Map(lastActiveRows.map((r) => [r.userId, r.lastActive as string]));
    const timelinessMap = (rows: any[]) =>
      new Map(rows.map((r) => [r.userId, { early: Number(r.early), onTime: Number(r.onTime), late: Number(r.late) }]));
    const taskTimelinessMap = timelinessMap(taskTimelinessRows);
    const cardTimelinessMap = timelinessMap(cardTimelinessRows);

    return users.map((u) => {
      // Log habit is measured over the last 30 days: working days that have passed (Mon to Fri, after the person joined),
      // and how many of them have a log. Leave and holiday entries count as logged, and today is never held against anyone.
      const userToday = getZonedDateString(new Date(), u.timezone);
      const joined = getZonedDateString(u.createdAt, u.timezone);
      const from = joined > addDaysToDateString(userToday, -29) ? joined : addDaysToDateString(userToday, -29);
      const to = addDaysToDateString(userToday, -1);
      const workingDays = from <= to ? countWeekdays(from, to) : 0;
      const logged = recentLogs.get(u.id) ?? new Set<string>();
      let loggedDays = 0;
      for (let d = from; d <= to; d = addDaysToDateString(d, 1)) {
        const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
        if (dow !== 0 && dow !== 6 && logged.has(d)) loggedDays++;
      }
      const missedDays = Math.max(workingDays - loggedDays, 0);
      const tt = taskTimelinessMap.get(u.id) || { early: 0, onTime: 0, late: 0 };
      const ct = cardTimelinessMap.get(u.id) || { early: 0, onTime: 0, late: 0 };

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        meetingsCount: meetingsMap.get(u.id) || 0,
        // Personal tasks and board cards are both "tasks" to a person; a card is done once it is archived.
        tasksCount: (taskMap.get(u.id)?.count || 0) + (cardsMap.get(u.id) || 0),
        tasksCompleted: (taskMap.get(u.id)?.completed || 0) + (cardsDoneMap.get(u.id) || 0),
        cardsCount: cardsMap.get(u.id) || 0,
        workLogsCount: workLogsMap.get(u.id) || 0,
        lastActive: lastActiveMap.get(u.id) || null,
        timeliness: {
          early: tt.early + ct.early,
          onTime: tt.onTime + ct.onTime,
          late: tt.late + ct.late,
        },
        workLogCompliance: {
          workingDays,
          loggedDays,
          missedDays,
          rate: workingDays > 0 ? Math.round((loggedDays / workingDays) * 100) : 100,
          windowDays: 30,
        },
      };
    });
  }

  // Full drill-down for a single user: every meeting/task/card/work-log/activity detail.
  async userDetail(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    const today = getZonedDateString(new Date(), user.timezone);
    const sevenDaysAgo = addDaysToDateString(today, -7);
    const thirtyDaysAgo = addDaysToDateString(today, -30);

    const [
      meetingsTotal,
      meetingsRecent,
      meetingTypeRows,
      tasksTotal,
      tasksCompleted,
      tasksOverdue,
      tasksRecent,
      taskStatusRows,
      taskTimelinessRow,
      cardsTotal,
      cardsActive,
      cardsArchived,
      cardsOverdue,
      cardsRecent,
      cardPriorityRows,
      cardTimelinessRow,
      workLogsTotal,
      workLogsRecent,
      workLogsOnLeave,
      workLogsHoliday,
      workLogDatesLast30d,
      activityTotal,
      activity7d,
      activity30d,
      activityRecent,
    ] = await Promise.all([
      this.meetingRepo.count({ where: { userId } }),
      this.meetingRepo.find({ where: { userId }, order: { date: 'DESC' }, take: 10 }),
      this.meetingRepo
        .createQueryBuilder('m')
        .select("COALESCE(NULLIF(m.\"meetingType\", ''), 'Unspecified')", 'label')
        .addSelect('COUNT(*)', 'count')
        .where('m."userId" = :userId', { userId })
        .groupBy('label')
        .getRawMany(),

      this.taskRepo.count({ where: { userId } }),
      this.taskRepo.count({ where: { userId, completed: true } }),
      this.taskRepo
        .createQueryBuilder('t')
        .where('t."userId" = :userId', { userId })
        .andWhere('t.completed = false')
        .andWhere('t."dueDate" IS NOT NULL')
        .andWhere('t."dueDate" < :today', { today })
        .getCount(),
      this.taskRepo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 10 }),
      this.taskRepo.createQueryBuilder('t').select('t.status', 'label').addSelect('COUNT(*)', 'count').where('t."userId" = :userId', { userId }).groupBy('t.status').getRawMany(),
      this.taskRepo
        .createQueryBuilder('t')
        .select('COUNT(*) FILTER (WHERE t."completedAt"::date < t."dueDate")', 'early')
        .addSelect('COUNT(*) FILTER (WHERE t."completedAt"::date = t."dueDate")', 'onTime')
        .addSelect('COUNT(*) FILTER (WHERE t."completedAt"::date > t."dueDate")', 'late')
        .where('t."userId" = :userId', { userId })
        .andWhere('t.completed = true')
        .andWhere('t."completedAt" IS NOT NULL')
        .andWhere('t."dueDate" IS NOT NULL')
        .getRawOne(),

      this.ownedCards().where(`${AdminAnalyticsService.CARD_OWNER} = :userId`, { userId }).getCount(),
      this.ownedCards().where(`${AdminAnalyticsService.CARD_OWNER} = :userId`, { userId }).andWhere('c.archived = false').getCount(),
      this.ownedCards().where(`${AdminAnalyticsService.CARD_OWNER} = :userId`, { userId }).andWhere('c.archived = true').getCount(),
      this.ownedCards()
        .where(`${AdminAnalyticsService.CARD_OWNER} = :userId`, { userId })
        .andWhere('c.archived = false')
        .andWhere('c."dueDate" IS NOT NULL')
        .andWhere('c."dueDate" < :today', { today })
        .getCount(),
      this.ownedCards().where(`${AdminAnalyticsService.CARD_OWNER} = :userId`, { userId }).orderBy('c."createdAt"', 'DESC').limit(10).getMany(),
      this.ownedCards()
        .select("COALESCE(NULLIF(c.priority, ''), 'None')", 'label')
        .addSelect('COUNT(*)', 'count')
        .where(`${AdminAnalyticsService.CARD_OWNER} = :userId`, { userId })
        .andWhere('c.archived = false')
        .groupBy('label')
        .getRawMany(),
      this.ownedCards()
        .select('COUNT(*) FILTER (WHERE c."archivedAt"::date < c."dueDate")', 'early')
        .addSelect('COUNT(*) FILTER (WHERE c."archivedAt"::date = c."dueDate")', 'onTime')
        .addSelect('COUNT(*) FILTER (WHERE c."archivedAt"::date > c."dueDate")', 'late')
        .where(`${AdminAnalyticsService.CARD_OWNER} = :userId`, { userId })
        .andWhere('c.archived = true')
        .andWhere('c."archivedAt" IS NOT NULL')
        .andWhere('c."dueDate" IS NOT NULL')
        .getRawOne(),

      this.workLogRepo.count({ where: { userId } }),
      this.workLogRepo.find({ where: { userId }, order: { date: 'DESC' }, take: 14 }),
      this.workLogRepo.count({ where: { userId, todayOnLeave: true } }),
      this.workLogRepo.count({ where: { userId, todayHoliday: true } }),
      this.workLogRepo.createQueryBuilder('w').select(`to_char(w.date, 'YYYY-MM-DD')`, 'date').where('w."userId" = :userId', { userId }).andWhere('w.date >= :since', { since: addDaysToDateString(today, -35) }).getRawMany(),

      this.activityLogRepo.count({ where: { userId } }),
      this.activityLogRepo.createQueryBuilder('a').where('a."userId" = :userId', { userId }).andWhere('a."createdAt" >= :since', { since: sevenDaysAgo }).getCount(),
      this.activityLogRepo.createQueryBuilder('a').where('a."userId" = :userId', { userId }).andWhere('a."createdAt" >= :since', { since: thirtyDaysAgo }).getCount(),
      this.activityLogRepo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 15 }),
    ]);

    // Tags a completed item as early/onTime/late by comparing its completion date to its due date.
    const timelinessTag = (doneAt?: Date | string, dueDate?: string): 'early' | 'onTime' | 'late' | null => {
      if (!doneAt || !dueDate) return null;
      const doneDateStr = getZonedDateString(new Date(doneAt));
      if (doneDateStr < dueDate) return 'early';
      if (doneDateStr === dueDate) return 'onTime';
      return 'late';
    };

    // Log compliance is measured over the last 30 days, the same way the Performance page does it: working days that have
    // passed (Mon to Fri, after the person joined) and how many of them have a log. Today is never counted as missed.
    const joined = getZonedDateString(user.createdAt, user.timezone);
    const windowStart = addDaysToDateString(today, -29);
    const winFrom = joined > windowStart ? joined : windowStart;
    const winTo = addDaysToDateString(today, -1);
    const loggedDatesLast30d = new Set(workLogDatesLast30d.map((r: any) => String(r.date).slice(0, 10)));
    const missedRecentDates: string[] = [];
    let workingDays = 0;
    let loggedDays = 0;
    for (let d = winFrom; d <= winTo; d = addDaysToDateString(d, 1)) {
      const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      workingDays++;
      if (loggedDatesLast30d.has(d)) loggedDays++; else missedRecentDates.push(d);
    }
    const missedDays = workingDays - loggedDays;

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, timezone: user.timezone, createdAt: user.createdAt },
      meetings: {
        total: meetingsTotal,
        byType: meetingTypeRows.map((r) => ({ label: r.label, count: Number(r.count) })),
        recent: meetingsRecent.map((m) => ({ id: m.id, date: m.date, meetingType: m.meetingType, center: m.center, place: m.place, day: m.day })),
      },
      tasks: {
        total: tasksTotal,
        completed: tasksCompleted,
        overdue: tasksOverdue,
        byStatus: taskStatusRows.map((r) => ({ label: r.label, count: Number(r.count) })),
        timeliness: {
          early: Number(taskTimelinessRow?.early || 0),
          onTime: Number(taskTimelinessRow?.onTime || 0),
          late: Number(taskTimelinessRow?.late || 0),
        },
        recent: tasksRecent.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          completed: t.completed,
          dueDate: t.dueDate,
          createdAt: t.createdAt,
          timeliness: t.completed ? timelinessTag(t.completedAt, t.dueDate) : null,
        })),
      },
      cards: {
        total: cardsTotal,
        active: cardsActive,
        archived: cardsArchived,
        overdue: cardsOverdue,
        byPriority: cardPriorityRows.map((r) => ({ label: r.label, count: Number(r.count) })),
        timeliness: {
          early: Number(cardTimelinessRow?.early || 0),
          onTime: Number(cardTimelinessRow?.onTime || 0),
          late: Number(cardTimelinessRow?.late || 0),
        },
        recent: cardsRecent.map((c) => ({
          id: c.id,
          title: c.title,
          priority: c.priority,
          archived: c.archived,
          dueDate: c.dueDate,
          timeliness: c.archived ? timelinessTag(c.archivedAt, c.dueDate) : null,
        })),
      },
      workLogs: {
        total: workLogsTotal,
        onLeave: workLogsOnLeave,
        holiday: workLogsHoliday,
        compliance: {
          workingDays,
          loggedDays,
          missedDays,
          rate: workingDays > 0 ? Math.round((loggedDays / workingDays) * 100) : 100,
          missedRecentDates,
        },
        recent: workLogsRecent.map((w) => ({
          date: w.date,
          todayWork: w.todayWork,
          todayOnLeave: w.todayOnLeave,
          todayHoliday: w.todayHoliday,
          tomorrowWork: w.tomorrowWork,
          tomorrowOnLeave: w.tomorrowOnLeave,
          tomorrowHoliday: w.tomorrowHoliday,
        })),
      },
      activity: {
        total: activityTotal,
        last7d: activity7d,
        last30d: activity30d,
        recent: activityRecent.map((a) => ({ method: a.method, path: a.path, statusCode: a.statusCode, createdAt: a.createdAt })),
      },
    };
  }
}
