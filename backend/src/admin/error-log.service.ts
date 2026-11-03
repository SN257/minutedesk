import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorLog } from './error-log.entity';
import { User } from '../users/entities/user.entity';

interface RecordErrorInput {
  source: 'backend' | 'frontend';
  message: string;
  stack?: string;
  path?: string;
  userId?: string;
  statusCode?: number;
  meta?: any;
}

@Injectable()
export class ErrorLogService {
  constructor(
    @InjectRepository(ErrorLog) private readonly repo: Repository<ErrorLog>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async record(input: RecordErrorInput): Promise<void> {
    let userEmail: string | undefined;
    if (input.userId) {
      const user = await this.userRepo.findOne({ where: { id: input.userId } });
      userEmail = user?.email;
    }
    await this.repo.save(this.repo.create({ ...input, userEmail, status: 'open' }));
  }

  async findAll(filters: { source?: string; status?: string } = {}): Promise<ErrorLog[]> {
    const where: any = {};
    if (filters.source) where.source = filters.source;
    if (filters.status) where.status = filters.status;
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: 500 });
  }

  async updateStatus(id: string, status: 'open' | 'in_progress' | 'resolved'): Promise<ErrorLog | null> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) return null;
    entry.status = status;
    entry.resolvedAt = status === 'resolved' ? new Date() : undefined;
    return this.repo.save(entry);
  }

  async counts(): Promise<{ open: number; inProgress: number; resolved: number; total: number }> {
    const [open, inProgress, resolved, total] = await Promise.all([
      this.repo.count({ where: { status: 'open' } }),
      this.repo.count({ where: { status: 'in_progress' } }),
      this.repo.count({ where: { status: 'resolved' } }),
      this.repo.count(),
    ]);
    return { open, inProgress, resolved, total };
  }
}
