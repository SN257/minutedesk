import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';
import { User } from '../users/entities/user.entity';

interface RecordActivityInput {
  userId?: string;
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog) private readonly repo: Repository<ActivityLog>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async record(input: RecordActivityInput): Promise<void> {
    let userEmail: string | undefined;
    if (input.userId) {
      const user = await this.userRepo.findOne({ where: { id: input.userId } });
      userEmail = user?.email;
    }
    await this.repo.save(this.repo.create({ ...input, userEmail }));
  }

  async findRecent(limit = 200, userId?: string): Promise<ActivityLog[]> {
    return this.repo.find({
      where: userId ? { userId } : {},
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    });
  }
}
