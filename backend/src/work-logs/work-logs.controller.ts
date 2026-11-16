
import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
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

    /** The days in a date range that have a log, for the dashboard's period filter. Declared before ':date' so it is not read as a date. */
    @Get('range/list')
    async range(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string) {
        const ok = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
        if (!ok(from) || !ok(to)) throw new HttpException('from and to must be YYYY-MM-DD dates', HttpStatus.BAD_REQUEST);
        return this.workLogsService.getRange(req.session.userId, from as string, to as string);
    }

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
