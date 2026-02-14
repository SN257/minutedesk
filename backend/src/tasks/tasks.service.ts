import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './tasks.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    const task = this.repo.create({ ...dto, userId, completed: false, status: dto.status ?? 'todo' });
    return this.repo.save(task);
  }

  async findAllForUser(userId: string): Promise<Task[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOneForUser(userId: string, id: string): Promise<Task | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async updateForUser(userId: string, id: string, dto: UpdateTaskDto): Promise<Task | null> {
    const existing = await this.findOneForUser(userId, id);
    if (!existing) return null;
    const updated = this.repo.merge(existing, dto);
    return this.repo.save(updated);
  }

  async removeForUser(userId: string, id: string): Promise<boolean> {
    const res = await this.repo.delete({ id, userId });
    return (res.affected ?? 0) > 0;
  }

  // Create task for a specific user (for admin/system operations)
  async createForUser(targetUserId: string, dto: CreateTaskDto): Promise<Task> {
    const task = this.repo.create({ ...dto, userId: targetUserId, completed: false, status: dto.status ?? 'todo' });
    return this.repo.save(task);
  }
}
