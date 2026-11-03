import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSettings } from './app-settings.entity';

@Injectable()
export class AppSettingsService {
  constructor(
    @InjectRepository(AppSettings) private readonly repo: Repository<AppSettings>,
  ) {}

  async get(): Promise<AppSettings> {
    const existing = await this.repo.find({ take: 1 });
    if (existing.length > 0) return existing[0];
    return this.repo.save(this.repo.create({}));
  }

  async update(patch: Partial<Pick<AppSettings, 'siteName' | 'logoUrl' | 'faviconUrl' | 'primaryColor'>>): Promise<AppSettings> {
    const settings = await this.get();
    Object.assign(settings, patch);
    return this.repo.save(settings);
  }
}
