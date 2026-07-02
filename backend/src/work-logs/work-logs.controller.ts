
import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { WorkLogsService } from './work-logs.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UsersService } from '../users/users.service';
import { getZonedDateString, addDaysToDateString } from '../common/timezone.util';

@Controller('work-logs')
@UseGuards(AuthGuard)
export class WorkLogsController {
    constructor(
        private readonly workLogsService: WorkLogsService,
        private readonly usersService: UsersService,
    ) { }

    @Get(':date')
    async getLog(@Req() req: any, @Param('date') date: string) {
        return this.workLogsService.getLog(req.session.userId, date);
    }

    @Get('missing/yesterday')
    async missingYesterday(@Req() req: any) {
        const user = await this.usersService.findById(req.session.userId);
        const todayStr = getZonedDateString(new Date(), user?.timezone);
        const dateStr = addDaysToDateString(todayStr, -1);
        const exists = await this.workLogsService.hasWorkLogForDate(req.session.userId, dateStr);
        return { missing: !exists, date: dateStr };
    }

    @Post()
    async saveLog(
        @Req() req: any,
        @Body() body: { 
            date: string; 
            todayWork: string; 
            tomorrowWork: string;
            todayOnLeave?: boolean;
            todayHoliday?: boolean;
            tomorrowOnLeave?: boolean;
            tomorrowHoliday?: boolean;
        },
    ) {
        return this.workLogsService.createOrUpdate(
            req.session.userId,
            body.date,
            body.todayWork,
            body.tomorrowWork,
            body.todayOnLeave,
            body.todayHoliday,
            body.tomorrowOnLeave,
            body.tomorrowHoliday,
        );
    }
}
