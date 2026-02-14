import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledMeeting } from './scheduled-meetings.entity';
import { CreateScheduledMeetingDto } from './dto/create-scheduled-meeting.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ScheduledMeetingsService {
  constructor(
    @InjectRepository(ScheduledMeeting)
    private scheduledMeetingsRepository: Repository<ScheduledMeeting>,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createDto: CreateScheduledMeetingDto): Promise<ScheduledMeeting> {
    const scheduledMeeting = this.scheduledMeetingsRepository.create({ ...createDto, userId });
    const saved = await this.scheduledMeetingsRepository.save(scheduledMeeting);
    
    // Create instant notification for scheduled meeting
    const title = `Meeting scheduled: ${saved.center || 'Meeting'}`;
    const body = `Your meeting is scheduled for ${saved.date} at ${saved.startTime}`;
    await this.notificationsService.createForUser(userId, title, body, {
      meetingId: saved.id,
      type: 'meeting_scheduled',
      category: 'Meeting',
      date: saved.date,
      startTime: saved.startTime,
    });
    
    return saved;
  }

  async findAll(userId: string, includeUsed = false): Promise<ScheduledMeeting[]> {
    // If includeUsed is true, return all scheduled meetings (for editing list views)
    if (includeUsed) {
      return this.scheduledMeetingsRepository.find({ 
        where: { userId },
        order: { date: 'DESC', startTime: 'DESC' } 
      });
    }

    // Otherwise return scheduled meetings that have not yet been used to create minutes
    // Use a subquery to find scheduled meetings not referenced in meetings.scheduledMeetingId
    // Cast sm.id to text to match scheduledMeetingId type (varchar)
    return this.scheduledMeetingsRepository
      .createQueryBuilder('sm')
      .where('sm.userId = :userId', { userId })
      .andWhere(qb => {
        const sub = qb.subQuery()
          .select('m."scheduledMeetingId"')
          .from('meetings', 'm')
          .where('m."scheduledMeetingId" IS NOT NULL')
          .getQuery();
        return 'sm.id::text NOT IN ' + sub;
      })
      .orderBy('sm.date', 'DESC')
      .addOrderBy('sm."start_time"', 'DESC')
      .getMany();
  }

  async findByDateRange(userId: string, startDate: string, endDate: string): Promise<ScheduledMeeting[]> {
    return this.scheduledMeetingsRepository
      .createQueryBuilder('sm')
      .where('sm.userId = :userId', { userId })
      .andWhere('sm.date >= :startDate AND sm.date <= :endDate', { startDate, endDate })
      .orderBy('sm.date', 'ASC')
      .addOrderBy('sm.start_time', 'ASC')
      .getMany();
  }

  async findOne(userId: string, id: string): Promise<ScheduledMeeting> {
    return this.scheduledMeetingsRepository.findOne({ where: { id, userId } });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.scheduledMeetingsRepository.delete({ id, userId });
  }

  async update(userId: string, id: string, updateDto: CreateScheduledMeetingDto): Promise<ScheduledMeeting> {
    await this.scheduledMeetingsRepository.update({ id, userId }, updateDto);
    const updated = await this.findOne(userId, id);
    
    // Create instant notification for meeting update
    if (updated) {
      const title = `Meeting updated: ${updated.center || 'Meeting'}`;
      const body = `Your meeting has been updated for ${updated.date} at ${updated.startTime}`;
      await this.notificationsService.createForUser(userId, title, body, {
        meetingId: updated.id,
        type: 'meeting_updated',
        category: 'Meeting',
        date: updated.date,
        startTime: updated.startTime,
      });
    }
    
    return updated;
  }
}
