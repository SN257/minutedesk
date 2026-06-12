import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Notification } from './notification.entity';
import { Card } from '../boards/card.entity';
import { Meeting } from '../meetings/meetings.entity';
import { ScheduledMeeting } from '../scheduled-meetings/scheduled-meetings.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkLog } from '../work-logs/work-log.entity';
import { User } from '../users/entities/user.entity';
import { MailService } from './mail.service';

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

  // Daily check for due date alerts and work log reminders
  @Cron('0 5 * * *')
  async sendDailyNotifications() {
    try {
      await this.sendDueDateAlerts();
      await this.sendWorkLogReminders();
      await this.sendOverdueTaskAlerts();
      await this.sendMissedWorkLogAlerts();
      await this.sendUpcomingMeetingReminders();
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

      // Check meetings for today and tomorrow (covers timezone edges)
      const todayStr = now.toISOString().split('T')[0];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const meetings = await this.meetingRepo.find({ where: [{ date: todayStr }, { date: tomorrowStr }] });

      // Also include scheduled meetings
      const scheduled = await this.scheduledMeetingRepo.createQueryBuilder('s')
        .where('s.date IN (:...dates)', { dates: [todayStr, tomorrowStr] })
        .getMany();

      const allMeetings: any[] = [ ...meetings, ...scheduled ];

      for (const m of allMeetings) {
        // unify start time field
        const startTime = m.startTime || m['startTime'] || m['start_time'];
        if (!startTime) continue;

        // normalize date field: some repos return Date objects, others strings
        const rawDate = m.date || m['date'];
        let dateStr: string;
        if (rawDate instanceof Date) {
          const d = rawDate as Date;
          const y = d.getFullYear();
          const m = ('0' + (d.getMonth() + 1)).slice(-2);
          const day = ('0' + d.getDate()).slice(-2);
          dateStr = `${y}-${m}-${day}`;
        } else {
          dateStr = String(rawDate);
        }

        // build a local datetime for the meeting start
        const dt = new Date(`${dateStr}T${startTime}`);
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
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Find all cards due today that are not archived
    const dueCards = await this.cardRepo.find({
      where: {
        dueDate: today,
        archived: false,
      },
    });

    for (const card of dueCards) {
      if (card.assignee) {
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
  }

  private async sendWorkLogReminders() {
    // Get unique assignees from active cards
    const assignees = await this.cardRepo
      .createQueryBuilder('card')
      .select('DISTINCT card.assignee', 'assignee')
      .where('card.assignee IS NOT NULL')
      .andWhere('card.archived = :archived', { archived: false })
      .getRawMany();

    const today = new Date().toISOString().split('T')[0];

    for (const { assignee } of assignees) {
      if (assignee) {
        const title = 'Daily Work Log Reminder';
        const body = 'Don\'t forget to log your work for today';
        await this.createForUser(assignee, title, body, {
          type: 'work_log_reminder',
          category: 'Reminder',
          date: today,
        });
      }
    }
  }

  private async sendOverdueTaskAlerts() {
    const today = new Date().toISOString().split('T')[0];
    
    // Find all cards that are overdue (due date before today) and not archived
    const overdueCards = await this.cardRepo
      .createQueryBuilder('card')
      .innerJoin('lists', 'l', 'l.id = card."listId"')
      .innerJoin('boards', 'b', 'b.id = l."boardId"')
      .select(['card.id', 'card.title', 'card.dueDate', 'card.assignee', 'b.userId'])
      .where('card.dueDate < :today', { today })
      .andWhere('card.archived = :archived', { archived: false })
      .getRawMany();

    for (const card of overdueCards) {
      const userId = card.card_assignee || card.b_userId;
      if (userId) {
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
  }

  private async sendMissedWorkLogAlerts() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Get all unique user IDs who have cards (active users)
    const users = await this.cardRepo
      .createQueryBuilder('card')
      .innerJoin('lists', 'l', 'l.id = card."listId"')
      .innerJoin('boards', 'b', 'b.id = l."boardId"')
      .select('DISTINCT b."userId"', 'userId')
      .getRawMany();

    for (const { userId } of users) {
      if (!userId) continue;

      // Check if user has work log for yesterday
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
