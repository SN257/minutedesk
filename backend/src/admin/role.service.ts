import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { User } from '../users/entities/user.entity';

const KEY_RE = /^[a-z][a-z0-9_]{1,30}$/;

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private readonly repo: Repository<Role>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async list(): Promise<Role[]> {
    return this.repo.find({ order: { createdAt: 'ASC' } });
  }

  async create(key: string, label: string, description?: string): Promise<Role> {
    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!KEY_RE.test(normalizedKey)) {
      throw new HttpException('Key must be lowercase letters, numbers, and underscores only (2-31 chars)', HttpStatus.BAD_REQUEST);
    }
    if (!label.trim()) throw new HttpException('Label is required', HttpStatus.BAD_REQUEST);
    const existing = await this.repo.findOne({ where: { key: normalizedKey } });
    if (existing) throw new HttpException('A role with this key already exists', HttpStatus.CONFLICT);
    return this.repo.save(this.repo.create({ key: normalizedKey, label: label.trim(), description, isSystem: false }));
  }

  async update(id: string, patch: { label?: string; description?: string }): Promise<Role> {
    const role = await this.repo.findOne({ where: { id } });
    if (!role) throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
    if (patch.label !== undefined) role.label = patch.label.trim();
    if (patch.description !== undefined) role.description = patch.description;
    return this.repo.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.repo.findOne({ where: { id } });
    if (!role) throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
    if (role.isSystem) throw new HttpException('System roles cannot be deleted', HttpStatus.FORBIDDEN);
    const inUse = await this.userRepo.count({ where: { role: role.key } });
    if (inUse > 0) throw new HttpException(`${inUse} user(s) still have this role — reassign them first`, HttpStatus.CONFLICT);
    await this.repo.remove(role);
  }
}
