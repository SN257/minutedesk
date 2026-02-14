import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledMeetingsController } from './scheduled-meetings.controller';
import { ScheduledMeetingsService } from './scheduled-meetings.service';
import { ScheduledMeeting } from './scheduled-meetings.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledMeeting]),
    NotificationsModule,
  ],
  controllers: [ScheduledMeetingsController],
  providers: [ScheduledMeetingsService],
  exports: [ScheduledMeetingsService],
})
export class ScheduledMeetingsModule {}
