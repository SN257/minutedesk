import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, Put, Req } from '@nestjs/common';
import { ScheduledMeetingsService } from './scheduled-meetings.service';
import { CreateScheduledMeetingDto } from './dto/create-scheduled-meeting.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('scheduled-meetings')
@UseGuards(AuthGuard)
export class ScheduledMeetingsController {
  constructor(private readonly scheduledMeetingsService: ScheduledMeetingsService) {}

  @Post()
  create(@Req() req: any, @Body() createDto: CreateScheduledMeetingDto) {
    return this.scheduledMeetingsService.create(req.session.userId, createDto);
  }

  @Get()
  findAll(@Req() req: any, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string, @Query('includeUsed') includeUsed?: string) {
    const userId = req.session.userId;
    if (startDate && endDate) {
      return this.scheduledMeetingsService.findByDateRange(userId, startDate, endDate);
    }
    const include = includeUsed === 'true' || includeUsed === '1';
    return this.scheduledMeetingsService.findAll(userId, include);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.scheduledMeetingsService.findOne(req.session.userId, id);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.scheduledMeetingsService.remove(req.session.userId, id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() updateDto: CreateScheduledMeetingDto) {
    return this.scheduledMeetingsService.update(req.session.userId, id, updateDto);
  }
}
