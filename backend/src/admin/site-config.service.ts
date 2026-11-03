import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteConfig } from './site-config.entity';

@Injectable()
export class SiteConfigService {
  constructor(@InjectRepository(SiteConfig) private readonly repo: Repository<SiteConfig>) {}

  private async row(): Promise<SiteConfig> {
    const existing = await this.repo.find({ take: 1 });
    if (existing.length > 0) return existing[0];
    return this.repo.save(this.repo.create({ draft: null, published: null }));
  }

  /** What everyone sees. Empty object means "use the built-in defaults". */
  async getPublished(): Promise<Record<string, any>> {
    return (await this.row()).published ?? {};
  }

  async getDraft() {
    const r = await this.row();
    const draft = r.draft ?? r.published ?? {};
    return { draft, published: r.published ?? {}, publishedAt: r.publishedAt ?? null, dirty: JSON.stringify(draft) !== JSON.stringify(r.published ?? {}) };
  }

  async saveDraft(draft: Record<string, any>) {
    const r = await this.row();
    r.draft = draft && typeof draft === 'object' ? draft : {};
    await this.repo.save(r);
    return this.getDraft();
  }

  async publish() {
    const r = await this.row();
    r.published = r.draft ?? r.published ?? {};
    r.publishedAt = new Date();
    await this.repo.save(r);
    return this.getDraft();
  }

  /** Throw the draft away and go back to what is published. */
  async discard() {
    const r = await this.row();
    r.draft = r.published ?? {};
    await this.repo.save(r);
    return this.getDraft();
  }
}
