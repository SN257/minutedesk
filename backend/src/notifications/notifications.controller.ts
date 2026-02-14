import { Controller, Post, Get, Param, Body, Req, UseGuards, Put, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  async getForUser(@Req() req: any) {
    return this.svc.findForUser(req.session.userId);
  }

  @Post()
  async createForUser(@Req() req: any, @Body() body: { title: string; message?: string; meta?: any }) {
    return this.svc.createForUser(req.session.userId, body.title, body.message, body.meta);
  }

  @Put(':id/read')
  async markRead(@Req() req: any, @Param('id') id: string) {
    const updated = await this.svc.markRead(req.session.userId, id);
    if (!updated) throw new NotFoundException('Notification not found');
    return updated;
  }
}
