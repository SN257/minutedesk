import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from './center.entity';

@Injectable()
export class CenterService {
  constructor(@InjectRepository(Center) private readonly repo: Repository<Center>) {}

  async listActive(): Promise<Center[]> {
    return this.repo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async listAll(): Promise<Center[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async create(name: string): Promise<Center> {
    const trimmed = name.trim();
    if (!trimmed) throw new HttpException('Name is required', HttpStatus.BAD_REQUEST);
    const existing = await this.repo.findOne({ where: { name: trimmed } });
    if (existing) throw new HttpException('A center with this name already exists', HttpStatus.CONFLICT);
    return this.repo.save(this.repo.create({ name: trimmed, isActive: true }));
  }

  async update(id: string, patch: { name?: string; isActive?: boolean }): Promise<Center> {
    const center = await this.repo.findOne({ where: { id } });
    if (!center) throw new HttpException('Center not found', HttpStatus.NOT_FOUND);
    if (patch.name !== undefined) center.name = patch.name.trim();
    if (patch.isActive !== undefined) center.isActive = patch.isActive;
    return this.repo.save(center);
  }

  async remove(id: string): Promise<void> {
    const center = await this.repo.findOne({ where: { id } });
    if (!center) throw new HttpException('Center not found', HttpStatus.NOT_FOUND);
    await this.repo.remove(center);
  }
}
