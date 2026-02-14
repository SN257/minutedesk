
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkLog } from './work-log.entity';
import { WorkLogsController } from './work-logs.controller';
import { WorkLogsService } from './work-logs.service';
import { BoardsModule } from '../boards/boards.module';

@Module({
    imports: [TypeOrmModule.forFeature([WorkLog]), BoardsModule],
    controllers: [WorkLogsController],
    providers: [WorkLogsService],
    exports: [WorkLogsService],
})
export class WorkLogsModule { }
