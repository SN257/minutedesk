import { Controller, Post, Get, Body, Param, UseGuards, Delete, Put, HttpCode, HttpStatus, NotFoundException, Req } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { Meeting } from './meetings.entity';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('meetings')
@UseGuards(AuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  async create(@Req() req: any, @Body() meetingData: Partial<Meeting>): Promise<Meeting> {
    return this.meetingsService.create(req.session.userId, meetingData);
  }

  @Get()
  async findAll(@Req() req: any): Promise<Meeting[]> {
    return this.meetingsService.findAll(req.session.userId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string): Promise<Meeting> {
    return this.meetingsService.findOne(req.session.userId, id);
  }

  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() meetingData: Partial<Meeting>): Promise<Meeting> {
    return this.meetingsService.update(req.session.userId, id, meetingData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: any, @Param('id') id: string): Promise<void> {
    const deleted = await this.meetingsService.remove(req.session.userId, id);
    if (!deleted) {
      throw new NotFoundException('Meeting not found');
    }
  }
}
