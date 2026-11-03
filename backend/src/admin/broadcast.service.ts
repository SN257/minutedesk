import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Broadcast } from './broadcast.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BroadcastService {
  constructor(
    @InjectRepository(Broadcast) private readonly repo: Repository<Broadcast>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async send(title: string, body: string | undefined, audience: 'all' | 'user' | 'super_admin', sentByEmail?: string): Promise<Broadcast> {
    const targets = audience === 'all' ? await this.userRepo.find() : await this.userRepo.find({ where: { role: audience } });

    // Save the record first so its id can be embedded in each notification's
    // meta — createForUser dedupes on exact meta match, and without a
    // per-broadcast identifier a second broadcast with the same title would
    // silently fail to deliver to users who already got the first one.
    const record = await this.repo.save(this.repo.create({ title, body, audience, recipientCount: targets.length, sentByEmail }));

    await Promise.all(
      targets.map((u) =>
        this.notificationsService.createForUser(u.id, title, body, { type: 'admin_broadcast', category: 'System', broadcastId: record.id }),
      ),
    );

    return record;
  }

  async history(): Promise<Broadcast[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: 50 });
  }
}
