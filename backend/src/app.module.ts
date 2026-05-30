import { Module, Controller, Get } from '@nestjs/common';
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

@Controller()
export class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? {
          url: process.env.DATABASE_URL,
          ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
        }
        : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT, 10) || 5432,
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'minutedesk',
        }),
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
  controllers: [HealthController],
})
export class AppModule { }
