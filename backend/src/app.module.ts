import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MeetingsModule } from './meetings/meetings.module';
import { ScheduledMeetingsModule } from './scheduled-meetings/scheduled-meetings.module';
import { TasksModule } from './tasks/tasks.module';
import { BoardsModule } from './boards/boards.module';
import { WorkLogsModule } from './work-logs/work-logs.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'minutedesk',
      autoLoadEntities: true,
      synchronize: false, // Use migrations instead
      migrations: ['dist/migrations/*.js'],
      migrationsRun: false, // Run migrations manually
    }),
    AuthModule,
    UsersModule,
    MeetingsModule,
    ScheduledMeetingsModule,
    TasksModule,
    BoardsModule,
    WorkLogsModule,
    // Notifications
    NotificationsModule,
  ],
})
export class AppModule { }
