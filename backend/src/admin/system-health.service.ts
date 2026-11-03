import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MailService } from '../notifications/mail.service';

@Injectable()
export class SystemHealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  async check() {
    const dbStart = Date.now();
    let dbOk = true;
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      dbOk = false;
    }
    const dbLatencyMs = Date.now() - dbStart;

    const mem = process.memoryUsage();

    return {
      db: { ok: dbOk, latencyMs: dbLatencyMs },
      mail: { configured: this.mailService.isConfigured() },
      uptimeSeconds: Math.round(process.uptime()),
      memory: { rssMb: Math.round(mem.rss / 1024 / 1024), heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024) },
      nodeVersion: process.version,
      backupSchedule: 'Nightly at 02:00 server time',
    };
  }
}
