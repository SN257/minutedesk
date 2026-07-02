import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification } from './notification.entity';
import { Card } from '../boards/card.entity';
import { Meeting } from '../meetings/meetings.entity';
import { ScheduledMeeting } from '../scheduled-meetings/scheduled-meetings.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkLog } from '../work-logs/work-log.entity';
import { User } from '../users/entities/user.entity';
import { MailService } from './mail.service';
import { getZonedDateString, getZonedHourMinute, addDaysToDateString, zonedTimeToUtc } from '../common/timezone.util';

// Hour (in each user's own local timezone) at which daily reminder emails go out.
const REMINDER_HOUR = 7;

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @InjectRepository(Card)
    private readonly cardRepo: Repository<Card>,
    @InjectRepository(WorkLog)
    private readonly workLogRepo: Repository<WorkLog>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(ScheduledMeeting)
    private readonly scheduledMeetingRepo: Repository<ScheduledMeeting>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  async createForUser(userId: string, title: string, body?: string, meta?: any) {
    // avoid duplicate notifications when identical meta is provided
    if (meta) {
      const exists = await this.repo.findOne({ where: { userId, meta } });
      if (exists) return exists;
    }
    const n = this.repo.create({ userId, title, body, meta, read: false });
    const saved = await this.repo.save(n);

    // Send email notification asynchronously — never block on it
    this.userRepo.findOne({ where: { id: userId } }).then(user => {
      if (user?.email) {
        // Pass meta to mail service so it can generate contextual templates
        this.mailService.sendNotificationEmail(user.email, title, body, meta).catch(() => {});
      }
    }).catch(() => {});

    return saved;
  }

  async findForUser(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async markRead(userId: string, id: string) {
    const n = await this.repo.findOne({ where: { id, userId } });
    if (!n) return null;
    // remove notification from DB when user reads it
    await this.repo.remove(n);
    return n;
  }

  private async getUsersMap(userIds: (string | undefined | null)[]): Promise<Map<string, User>> {
    const ids = [...new Set(userIds.filter((id): id is string => !!id))];
    if (ids.length === 0) return new Map();
    const users = await this.userRepo.find({ where: { id: In(ids) } });
    return new Map(users.map(u => [u.id, u]));
  }

  // Returns true if it's currently REMINDER_HOUR in the given user's local timezone.
  // Gates the hourly cron so each user only gets a given daily reminder once, at
  // their own local morning, regardless of what timezone the server runs in.
  private isReminderHourForUser(user: User | undefined, now: Date): boolean {
    return getZonedHourMinute(now, user?.timezone).hour === REMINDER_HOUR;
  }

  // Runs once an hour; each check below only acts on users for whom it's currently
  // their own local REMINDER_HOUR, so every user gets these once a day, on their
  // own clock, no matter what timezone the server is in.
  @Cron('0 * * * *')
  async sendDailyNotifications() {
    try {
      await this.sendDueDateAlerts();
      await this.sendWorkLogReminders();
      await this.sendOverdueTaskAlerts();
      await this.sendMissedWorkLogAlerts();
    } catch (e) {
      console.error('Error sending daily notifications:', e);
    }
  }

  // Run every minute to catch meetings starting soon (15 minutes prior)
  @Cron(CronExpression.EVERY_MINUTE)
  private async sendUpcomingMeetingReminders() {
    try {
      const now = new Date();
      const in15 = new Date(now.getTime() + 15 * 60 * 1000);

      // Coarse date window in UTC just to narrow down the SQL query; the exact
      // start-time comparison below is redone precisely per-meeting using each
      // meeting owner's own timezone, so a wide window here is safe.
      const dateCandidates = [-1, 0, 1].map(offset =>
        addDaysToDateString(now.toISOString().split('T')[0], offset),
      );

      const meetings = await this.meetingRepo.find({ where: dateCandidates.map(d => ({ date: d })) });

      // Also include scheduled meetings
      const scheduled = await this.scheduledMeetingRepo.createQueryBuilder('s')
        .where('s.date IN (:...dates)', { dates: dateCandidates })
        .getMany();

      const allMeetings: any[] = [ ...meetings, ...scheduled ];
      const usersById = await this.getUsersMap(allMeetings.map(m => m.userId));

      for (const m of allMeetings) {
        // unify start time field
        const startTime = m.startTime || m['startTime'] || m['start_time'];
        if (!startTime) continue;

        // normalize date field: some repos return Date objects, others strings
        const rawDate = m.date || m['date'];
        let dateStr: string;
        if (rawDate instanceof Date) {
          dateStr = getZonedDateString(rawDate, 'UTC');
        } else {
          dateStr = String(rawDate);
        }

        // build the real UTC instant the meeting starts at, interpreting the
        // wall-clock date+time in the meeting owner's own timezone
        const ownerTimezone = usersById.get(m.userId)?.timezone;
        const dt = zonedTimeToUtc(dateStr, startTime, ownerTimezone);
        if (isNaN(dt.getTime())) continue;

        // compare with the target time (in15) allowing a 1 minute tolerance
        const diff = dt.getTime() - in15.getTime();
        if (diff >= -60 * 1000 && diff < 60 * 1000) {
          const targetUser = m.userId;
          const title = `Meeting starts in 15 minutes: ${m.center || 'Meeting'}`;
          const body = `Your meeting at ${startTime} on ${dateStr} starts in ~15 minutes.`;
          await this.createForUser(targetUser, title, body, {
            meetingId: m.id,
            type: 'meeting_reminder',
            category: 'Reminder',
            date: dateStr,
            startTime,
          });
        }
      }
    } catch (e) {
      console.error('Error sending upcoming meeting reminders:', e);
    }
  }

  private async sendDueDateAlerts() {
    // Find all cards due "today" (for the assignee's own timezone) that are not archived
    const dueCards = await this.cardRepo.find({ where: { archived: false } });
    const usersById = await this.getUsersMap(dueCards.map(c => c.assignee));

    for (const card of dueCards) {
      if (!card.dueDate || !card.assignee) continue;
      const user = usersById.get(card.assignee);
      if (!this.isReminderHourForUser(user, new Date())) continue;

      const today = getZonedDateString(new Date(), user?.timezone);
      if (card.dueDate !== today) continue;

      const title = `Task due today: ${card.title}`;
      const body = `Reminder: "${card.title}" is due today`;
      await this.createForUser(card.assignee, title, body, {
        cardId: card.id,
        type: 'due_date_alert',
        category: 'Reminder',
        date: today,
      });
    }
  }

  private async sendWorkLogReminders() {
    // Get unique assignees from active cards
    const assignees = await this.cardRepo
      .createQueryBuilder('card')
      .select('DISTINCT card.assignee', 'assignee')
      .where('card.assignee IS NOT NULL')
      .andWhere('card.archived = :archived', { archived: false })
      .getRawMany();

    const usersById = await this.getUsersMap(assignees.map(a => a.assignee));

    for (const { assignee } of assignees) {
      if (!assignee) continue;
      const user = usersById.get(assignee);
      if (!this.isReminderHourForUser(user, new Date())) continue;

      const today = getZonedDateString(new Date(), user?.timezone);
      const title = 'Daily Work Log Reminder';
      const body = 'Don\'t forget to log your work for today';
      await this.createForUser(assignee, title, body, {
        type: 'work_log_reminder',
        category: 'Reminder',
        date: today,
      });
    }
  }

  private async sendOverdueTaskAlerts() {
    // Find all cards that are not archived and have a due date set
    const overdueCards = await this.cardRepo
      .createQueryBuilder('card')
      .innerJoin('lists', 'l', 'l.id = card."listId"')
      .innerJoin('boards', 'b', 'b.id = l."boardId"')
      .select(['card.id', 'card.title', 'card.dueDate', 'card.assignee', 'b.userId'])
      .where('card."dueDate" IS NOT NULL')
      .andWhere('card.archived = :archived', { archived: false })
      .getRawMany();

    const usersById = await this.getUsersMap(overdueCards.map(c => c.card_assignee || c.b_userId));

    for (const card of overdueCards) {
      const userId = card.card_assignee || card.b_userId;
      if (!userId) continue;
      const user = usersById.get(userId);
      if (!this.isReminderHourForUser(user, new Date())) continue;

      const today = getZonedDateString(new Date(), user?.timezone);
      if (!(card.card_dueDate < today)) continue;

      const title = `Task overdue: ${card.card_title}`;
      const body = `This task was due on ${card.card_dueDate}`;
      await this.createForUser(userId, title, body, {
        cardId: card.card_id,
        type: 'task_overdue',
        category: 'Task',
        date: today,
      });
    }
  }

  private async sendMissedWorkLogAlerts() {
    // Get all unique user IDs who have cards (active users)
    const users = await this.cardRepo
      .createQueryBuilder('card')
      .innerJoin('lists', 'l', 'l.id = card."listId"')
      .innerJoin('boards', 'b', 'b.id = l."boardId"')
      .select('DISTINCT b."userId"', 'userId')
      .getRawMany();

    const usersById = await this.getUsersMap(users.map(u => u.userId));

    for (const { userId } of users) {
      if (!userId) continue;
      const user = usersById.get(userId);
      if (!this.isReminderHourForUser(user, new Date())) continue;

      const todayStr = getZonedDateString(new Date(), user?.timezone);
      const yesterdayStr = addDaysToDateString(todayStr, -1);

      // Check if user has work log for yesterday (their own local yesterday)
      const hasWorkLog = await this.workLogRepo.findOne({
        where: { userId, date: yesterdayStr },
      });

      if (!hasWorkLog) {
        const title = 'Missed Yesterday\'s Work Log';
        const body = `You haven't logged your work for ${yesterdayStr}. Please update your work log.`;
        await this.createForUser(userId, title, body, {
          type: 'missed_work_log',
          category: 'Reminder',
          date: todayStr,
          missedDate: yesterdayStr,
        });
      }
    }
  }
}
