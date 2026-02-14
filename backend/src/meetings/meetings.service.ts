import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './meetings.entity';
import { BoardsService } from '../boards/boards.service';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private meetingsRepository: Repository<Meeting>,
    private boardsService: BoardsService,
  ) {}

  async create(userId: string, meetingData: Partial<Meeting>): Promise<Meeting> {
    const meeting = this.meetingsRepository.create({ ...meetingData, userId });
    return this.meetingsRepository.save(meeting);
  }

  async findAll(userId: string): Promise<Meeting[]> {
    return this.meetingsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Meeting> {
    return this.meetingsRepository.findOne({ where: { id, userId } });
  }

  async update(userId: string, id: string, meetingData: Partial<Meeting>): Promise<Meeting> {
    const existing = await this.findOne(userId, id);
    if (!existing) return null;
    await this.meetingsRepository.update({ id, userId }, meetingData);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    // Load meeting to find any associated task/card IDs to cleanup
    const existing = await this.findOne(userId, id);
    if (!existing) return false;

    try {
      const taskIds: string[] = (existing.notes || []).flatMap((n: any) => (n.points || []).map((p: any) => p.taskId).filter(Boolean));
      for (const tId of taskIds) {
        try {
          await this.boardsService.deleteCardById(tId);
        } catch (e) {
          // ignore errors during cleanup
        }
      }
    } catch (e) {
      // ignore
    }

    const result = await this.meetingsRepository.delete({ id, userId });
    return result.affected > 0;
  }
}
