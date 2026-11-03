import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { BackupRecord } from './backup-record.entity';
import { User } from '../users/entities/user.entity';
import { Meeting } from '../meetings/meetings.entity';
import { ScheduledMeeting } from '../scheduled-meetings/scheduled-meetings.entity';
import { Task } from '../tasks/tasks.entity';
import { Board } from '../boards/board.entity';
import { List } from '../boards/list.entity';
import { Card } from '../boards/card.entity';
import { Comment } from '../boards/comment.entity';
import { WorkLog } from '../work-logs/work-log.entity';
import { MailService } from '../notifications/mail.service';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const RETENTION_COUNT = 14;

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    @InjectRepository(BackupRecord) private readonly recordRepo: Repository<BackupRecord>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Meeting) private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(ScheduledMeeting) private readonly scheduledMeetingRepo: Repository<ScheduledMeeting>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Board) private readonly boardRepo: Repository<Board>,
    @InjectRepository(List) private readonly listRepo: Repository<List>,
    @InjectRepository(Card) private readonly cardRepo: Repository<Card>,
    @InjectRepository(Comment) private readonly commentRepo: Repository<Comment>,
    @InjectRepository(WorkLog) private readonly workLogRepo: Repository<WorkLog>,
    private readonly mailService: MailService,
  ) {}

  // Nightly automatic backup. A logical (JSON) export via TypeORM rather than
  // shelling out to `pg_dump`, since that binary isn't guaranteed to exist on
  // whatever host runs this (e.g. Railway's Node runtime image).
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async nightlyBackup() {
    await this.runBackup(false);
  }

  async runBackup(manual: boolean): Promise<BackupRecord> {
    try {
      const [users, meetings, scheduledMeetings, tasks, boards, lists, cards, comments, workLogs] = await Promise.all([
        this.userRepo.find(),
        this.meetingRepo.find(),
        this.scheduledMeetingRepo.find(),
        this.taskRepo.find(),
        this.boardRepo.find(),
        this.listRepo.find(),
        this.cardRepo.find(),
        this.commentRepo.find(),
        this.workLogRepo.find(),
      ]);

      const tables = { users, meetings, scheduledMeetings, tasks, boards, lists, cards, comments, workLogs };
      const payload = { generatedAt: new Date().toISOString(), tables };
      const content = JSON.stringify(payload);
      const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      const filePath = path.join(BACKUP_DIR, filename);
      fs.writeFileSync(filePath, content);
      const sizeBytes = Buffer.byteLength(content);
      const tableCounts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]));

      const record = await this.recordRepo.save(
        this.recordRepo.create({ filename, sizeBytes: String(sizeBytes), status: 'success', manual, tableCounts }),
      );

      await this.emailToSuperAdmins(filename, content, sizeBytes, manual);
      record.emailed = true;
      await this.recordRepo.save(record);

      this.pruneOldBackups();
      this.logger.log(`Backup complete: ${filename} (${sizeBytes} bytes)`);
      return record;
    } catch (err: any) {
      this.logger.error(`Backup failed: ${err?.message}`, err?.stack);
      return this.recordRepo.save(
        this.recordRepo.create({ filename: '', sizeBytes: '0', status: 'failed', error: err?.message, manual }),
      );
    }
  }

  private async emailToSuperAdmins(filename: string, content: string, sizeBytes: number, manual: boolean) {
    const superAdmins = await this.userRepo.find({ where: { role: 'super_admin' } });
    const sizeKb = (sizeBytes / 1024).toFixed(1);
    const html = `
      <p>${manual ? 'A manual' : 'The nightly automatic'} database backup completed successfully.</p>
      <p><strong>File:</strong> ${filename}<br/><strong>Size:</strong> ${sizeKb} KB</p>
      <p>This backup is also available for download in the Admin Center.</p>
    `;
    await Promise.all(
      superAdmins
        .filter((u) => u.email)
        .map((u) =>
          this.mailService.sendMailWithAttachment(u.email, `MinuteDesk backup — ${filename}`, html, {
            filename,
            content,
            contentType: 'application/json',
          }),
        ),
    );
  }

  private pruneOldBackups() {
    try {
      const files = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
      for (const { f } of files.slice(RETENTION_COUNT)) {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
      }
    } catch {
      // best-effort cleanup only
    }
  }

  async list(): Promise<(BackupRecord & { fileExists: boolean })[]> {
    const records = await this.recordRepo.find({ order: { createdAt: 'DESC' }, take: 100 });
    return records.map((r) => ({
      ...r,
      fileExists: !!r.filename && fs.existsSync(path.join(BACKUP_DIR, r.filename)),
    }));
  }

  async getFileForDownload(id: string): Promise<{ filename: string; content: Buffer } | null> {
    const record = await this.recordRepo.findOne({ where: { id } });
    if (!record || !record.filename) return null;
    const filePath = path.join(BACKUP_DIR, record.filename);
    if (!fs.existsSync(filePath)) return null;
    return { filename: record.filename, content: fs.readFileSync(filePath) };
  }
}
