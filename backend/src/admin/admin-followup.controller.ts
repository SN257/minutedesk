import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { AdminFollowupService, REMINDER_KINDS, ReminderKind } from './admin-followup.service';
import { resolveUserIdFromRequest } from '../common/request-user.util';
import { UsersService } from '../users/users.service';

/** The admin "Follow-up" page: one person's work, meetings and work log, and reminders sent to them. */
@Controller('admin/followup')
@UseGuards(SuperAdminGuard)
export class AdminFollowupController {
  constructor(private readonly followup: AdminFollowupService, private readonly usersService: UsersService) {}

  @Get('users')
  list() {
    return this.followup.list();
  }

  @Get('users/:id')
  async detail(@Param('id') id: string, @Query('month') month?: string) {
    const d = await this.followup.detail(id, month);
    if (!d) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return d;
  }

  @Post('users/:id/remind')
  async remind(@Param('id') id: string, @Req() req: any, @Body() body: { kind?: string; title?: string; message?: string }) {
    const kind = body?.kind as ReminderKind;
    if (!REMINDER_KINDS.includes(kind)) throw new HttpException('Unknown reminder type', HttpStatus.BAD_REQUEST);
    const adminId = resolveUserIdFromRequest(req);
    const admin = adminId ? await this.usersService.findById(adminId) : null;
    return this.followup.remind(id, kind, { title: body.title, message: body.message }, { name: admin?.name, email: admin?.email });
  }
}
