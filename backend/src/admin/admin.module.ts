import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AdminController } from './admin.controller';
import { ActivityLog } from './activity-log.entity';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogInterceptor } from './activity-log.interceptor';
import { ErrorLog } from './error-log.entity';
import { ErrorLogService } from './error-log.service';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AppSettings } from './app-settings.entity';
import { SiteConfig } from './site-config.entity';
import { SiteConfigService } from './site-config.service';
import { AppSettingsService } from './app-settings.service';
import { BackupRecord } from './backup-record.entity';
import { BackupService } from './backup.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { SystemHealthService } from './system-health.service';
import { Broadcast } from './broadcast.entity';
import { BroadcastService } from './broadcast.service';
import { Center } from './center.entity';
import { CenterService } from './center.service';
import { Role } from './role.entity';
import { RoleService } from './role.service';
import { PublicListsController } from './public-lists.controller';
import { CustomTable } from './custom-table.entity';
import { SchemaService } from './schema.service';
import { SchemaController } from './schema.controller';
import { User } from '../users/entities/user.entity';
import { Meeting } from '../meetings/meetings.entity';
import { ScheduledMeeting } from '../scheduled-meetings/scheduled-meetings.entity';
import { Task } from '../tasks/tasks.entity';
import { Board } from '../boards/board.entity';
import { List } from '../boards/list.entity';
import { Card } from '../boards/card.entity';
import { Comment } from '../boards/comment.entity';
import { WorkLog } from '../work-logs/work-log.entity';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityLog,
      ErrorLog,
      AppSettings,
      SiteConfig,
      BackupRecord,
      Broadcast,
      Center,
      Role,
      CustomTable,
      User,
      Meeting,
      ScheduledMeeting,
      Task,
      Board,
      List,
      Card,
      Comment,
      WorkLog,
    ]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [AdminController, PublicListsController, SchemaController],
  providers: [
    ActivityLogService,
    ErrorLogService,
    AppSettingsService,
    SiteConfigService,
    BackupService,
    AdminAnalyticsService,
    SystemHealthService,
    BroadcastService,
    CenterService,
    RoleService,
    SchemaService,
    SuperAdminGuard,
    { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AdminModule {}
