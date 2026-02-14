
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkLog } from './work-log.entity';
import { BoardsService } from '../boards/boards.service';

@Injectable()
export class WorkLogsService {
    constructor(
        @InjectRepository(WorkLog)
        private workLogsRepository: Repository<WorkLog>,
        private boardsService: BoardsService,
    ) { }

    async getLog(userId: string, date: string): Promise<WorkLog | null> {
        return this.workLogsRepository.findOne({
            where: { userId, date },
        });
    }

    async createOrUpdate(
        userId: string, 
        date: string, 
        todayWork: string, 
        tomorrowWork: string,
        todayOnLeave?: boolean,
        todayHoliday?: boolean,
        tomorrowOnLeave?: boolean,
        tomorrowHoliday?: boolean
    ): Promise<WorkLog> {
        let log = await this.getLog(userId, date);

        if (log) {
            log.todayWork = todayWork;
            log.tomorrowWork = tomorrowWork;
            log.todayOnLeave = todayOnLeave || false;
            log.todayHoliday = todayHoliday || false;
            log.tomorrowOnLeave = tomorrowOnLeave || false;
            log.tomorrowHoliday = tomorrowHoliday || false;
        } else {
            log = this.workLogsRepository.create({
                userId,
                date,
                todayWork,
                tomorrowWork,
                todayOnLeave: todayOnLeave || false,
                todayHoliday: todayHoliday || false,
                tomorrowOnLeave: tomorrowOnLeave || false,
                tomorrowHoliday: tomorrowHoliday || false,
            });
        }

        const saved = await this.workLogsRepository.save(log);

        // Skip task creation if user is on leave or it's a holiday
        if (tomorrowOnLeave || tomorrowHoliday) {
            console.log('[WorkLog] User is on leave or holiday tomorrow, skipping task creation');
            // Delete any existing tasks for this date
            try {
                await this.boardsService.syncWorkLogTasks(userId, date, []);
            } catch (error) {
                console.error('[WorkLog] Failed to delete old cards:', error);
            }
            return saved;
        }

        // Auto-create/update tasks from tomorrow's work items
        if (tomorrowWork && tomorrowWork.trim()) {
            const tasks = tomorrowWork.split('\n').filter(t => t.trim());
            console.log('[WorkLog] Tomorrow work items:', tasks);
            if (tasks.length > 0) {
                try {
                    console.log('[WorkLog] Syncing cards for userId:', userId, 'date:', date);
                    const cards = await this.boardsService.syncWorkLogTasks(userId, date, tasks);
                    console.log('[WorkLog] Successfully synced', cards.length, 'cards');
                } catch (error) {
                    console.error('[WorkLog] Failed to sync cards from work log:', error);
                    // Don't fail the work log save if task creation fails
                }
            }
        } else {
            // If tomorrow work is empty, delete any existing tasks for this date
            try {
                console.log('[WorkLog] No tomorrow work, syncing empty task list for date:', date);
                await this.boardsService.syncWorkLogTasks(userId, date, []);
            } catch (error) {
                console.error('[WorkLog] Failed to delete old cards:', error);
            }
        }

        return saved;
    }

    async hasWorkLogForDate(userId: string, date: string): Promise<boolean> {
        const log = await this.workLogsRepository.findOne({ where: { userId, date } });
        if (!log) return false;
        // If on leave or holiday, consider it as having a work log
        if (log.todayOnLeave || log.todayHoliday) return true;
        // Treat a work log with no content as missing
        const today = (log.todayWork || '').trim();
        const tomorrow = (log.tomorrowWork || '').trim();
        return !!(today || tomorrow);
    }
}
