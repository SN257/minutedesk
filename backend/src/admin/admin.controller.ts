import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpException, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { AdminAnalyticsService } from './admin-analytics.service';
import { ActivityLogService } from './activity-log.service';
import { ErrorLogService } from './error-log.service';
import { AppSettingsService } from './app-settings.service';
import { SiteConfigService } from './site-config.service';
import { BackupService } from './backup.service';
import { SystemHealthService } from './system-health.service';
import { BroadcastService } from './broadcast.service';
import { CenterService } from './center.service';
import { RoleService } from './role.service';
import { resolveUserIdFromRequest } from '../common/request-user.util';
import { UsersService } from '../users/users.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly analyticsService: AdminAnalyticsService,
    private readonly activityLogService: ActivityLogService,
    private readonly errorLogService: ErrorLogService,
    private readonly appSettingsService: AppSettingsService,
    private readonly siteConfigService: SiteConfigService,
    private readonly backupService: BackupService,
    private readonly systemHealthService: SystemHealthService,
    private readonly broadcastService: BroadcastService,
    private readonly centerService: CenterService,
    private readonly roleService: RoleService,
    private readonly usersService: UsersService,
  ) {}

  // ── Analytics ──────────────────────────────────────────────────────────
  @Get('analytics/overview')
  @UseGuards(SuperAdminGuard)
  async analyticsOverview() {
    return this.analyticsService.overview();
  }

  @Get('analytics/trends')
  @UseGuards(SuperAdminGuard)
  async analyticsTrends(@Query('days') days?: string) {
    return this.analyticsService.trends(days ? parseInt(days, 10) : 30);
  }

  @Get('analytics/breakdowns')
  @UseGuards(SuperAdminGuard)
  async analyticsBreakdowns() {
    return this.analyticsService.breakdowns();
  }

  @Get('analytics/top-users')
  @UseGuards(SuperAdminGuard)
  async topUsers(@Query('limit') limit?: string) {
    return this.analyticsService.topActiveUsers(limit ? parseInt(limit, 10) : 10);
  }

  @Get('analytics/users')
  @UseGuards(SuperAdminGuard)
  async usersOverview() {
    return this.analyticsService.usersOverview();
  }

  @Get('analytics/users/:id')
  @UseGuards(SuperAdminGuard)
  async userDetail(@Param('id') id: string) {
    const detail = await this.analyticsService.userDetail(id);
    if (!detail) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return detail;
  }

  // ── Activity log ───────────────────────────────────────────────────────
  @Get('activity')
  @UseGuards(SuperAdminGuard)
  async activity(@Query('limit') limit?: string, @Query('userId') userId?: string) {
    return this.activityLogService.findRecent(limit ? parseInt(limit, 10) : 200, userId);
  }

  // ── Error log ("tickets") ──────────────────────────────────────────────
  // Public: any client (even logged out) can report a crash it just hit.
  @Post('errors/report')
  async reportError(@Req() req: any, @Body() body: { message?: string; stack?: string; path?: string; source?: 'backend' | 'frontend'; meta?: any }) {
    if (!body?.message) {
      throw new HttpException('message is required', HttpStatus.BAD_REQUEST);
    }
    await this.errorLogService.record({
      source: body.source === 'backend' ? 'backend' : 'frontend',
      message: body.message.slice(0, 2000),
      stack: body.stack?.slice(0, 8000),
      path: body.path?.slice(0, 500),
      userId: resolveUserIdFromRequest(req),
      meta: body.meta,
    });
    return { received: true };
  }

  @Get('errors')
  @UseGuards(SuperAdminGuard)
  async errors(@Query('source') source?: string, @Query('status') status?: string) {
    return this.errorLogService.findAll({ source, status });
  }

  @Get('errors/counts')
  @UseGuards(SuperAdminGuard)
  async errorCounts() {
    return this.errorLogService.counts();
  }

  @Patch('errors/:id/status')
  @UseGuards(SuperAdminGuard)
  async updateErrorStatus(@Param('id') id: string, @Body() body: { status: 'open' | 'in_progress' | 'resolved' }) {
    const updated = await this.errorLogService.updateStatus(id, body.status);
    if (!updated) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    return updated;
  }

  // ── App settings / branding ────────────────────────────────────────────
  // Public read so branding (site name, logo, favicon, color) can apply even
  // on the logged-out login screen.
  @Get('settings')
  async getSettings() {
    return this.appSettingsService.get();
  }

  @Put('settings')
  @UseGuards(SuperAdminGuard)
  async updateSettings(@Body() body: { siteName?: string; logoUrl?: string; faviconUrl?: string; primaryColor?: string }) {
    return this.appSettingsService.update(body);
  }

  // ── Site config (website text, menu, theme) ─────────────────────────────
  // The published version is public so the sign-in and landing pages can use it.
  @Get('site-config')
  async getSiteConfig() {
    return this.siteConfigService.getPublished();
  }

  @Get('site-config/draft')
  @UseGuards(SuperAdminGuard)
  async getSiteConfigDraft() {
    return this.siteConfigService.getDraft();
  }

  @Put('site-config/draft')
  @UseGuards(SuperAdminGuard)
  async saveSiteConfigDraft(@Body() body: { config?: Record<string, any> }) {
    return this.siteConfigService.saveDraft(body?.config ?? {});
  }

  @Post('site-config/publish')
  @UseGuards(SuperAdminGuard)
  async publishSiteConfig() {
    return this.siteConfigService.publish();
  }

  @Post('site-config/discard')
  @UseGuards(SuperAdminGuard)
  async discardSiteConfig() {
    return this.siteConfigService.discard();
  }

  // ── Backups ─────────────────────────────────────────────────────────────
  @Get('backups')
  @UseGuards(SuperAdminGuard)
  async listBackups() {
    return this.backupService.list();
  }

  @Post('backups/run')
  @UseGuards(SuperAdminGuard)
  async runBackup() {
    return this.backupService.runBackup(true);
  }

  @Get('backups/:id/download')
  @UseGuards(SuperAdminGuard)
  async downloadBackup(@Param('id') id: string, @Res() res: Response) {
    const file = await this.backupService.getFileForDownload(id);
    if (!file) throw new HttpException('Backup not found or no longer on disk', HttpStatus.NOT_FOUND);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
  }

  // ── System health ───────────────────────────────────────────────────────
  @Get('system/health')
  @UseGuards(SuperAdminGuard)
  async systemHealth() {
    return this.systemHealthService.check();
  }

  // ── Broadcasts ──────────────────────────────────────────────────────────
  @Get('broadcasts')
  @UseGuards(SuperAdminGuard)
  async broadcastHistory() {
    return this.broadcastService.history();
  }

  @Post('broadcasts')
  @UseGuards(SuperAdminGuard)
  async sendBroadcast(@Req() req: any, @Body() body: { title?: string; body?: string; audience?: 'all' | 'user' | 'super_admin' }) {
    if (!body?.title) throw new HttpException('title is required', HttpStatus.BAD_REQUEST);
    const userId = resolveUserIdFromRequest(req);
    const sender = userId ? await this.usersService.findById(userId) : null;
    return this.broadcastService.send(body.title, body.body, body.audience || 'all', sender?.email);
  }

  // ── Centers ──────────────────────────────────────────────────────────────
  @Get('centers')
  @UseGuards(SuperAdminGuard)
  async listAllCenters() {
    return this.centerService.listAll();
  }

  @Post('centers')
  @UseGuards(SuperAdminGuard)
  async createCenter(@Body() body: { name?: string }) {
    if (!body?.name) throw new HttpException('name is required', HttpStatus.BAD_REQUEST);
    return this.centerService.create(body.name);
  }

  @Put('centers/:id')
  @UseGuards(SuperAdminGuard)
  async updateCenter(@Param('id') id: string, @Body() body: { name?: string; isActive?: boolean }) {
    return this.centerService.update(id, body);
  }

  @Patch('centers/:id')
  @UseGuards(SuperAdminGuard)
  async patchCenter(@Param('id') id: string, @Body() body: { name?: string; isActive?: boolean }) {
    return this.centerService.update(id, body);
  }

  @Delete('centers/:id')
  @UseGuards(SuperAdminGuard)
  async deleteCenter(@Param('id') id: string) {
    await this.centerService.remove(id);
    return { deleted: true };
  }

  // ── Roles ────────────────────────────────────────────────────────────────
  @Get('roles')
  @UseGuards(SuperAdminGuard)
  async listAllRoles() {
    return this.roleService.list();
  }

  @Post('roles')
  @UseGuards(SuperAdminGuard)
  async createRole(@Body() body: { key?: string; label?: string; description?: string }) {
    if (!body?.key || !body?.label) throw new HttpException('key and label are required', HttpStatus.BAD_REQUEST);
    return this.roleService.create(body.key, body.label, body.description);
  }

  @Patch('roles/:id')
  @UseGuards(SuperAdminGuard)
  async updateRole(@Param('id') id: string, @Body() body: { label?: string; description?: string }) {
    return this.roleService.update(id, body);
  }

  @Delete('roles/:id')
  @UseGuards(SuperAdminGuard)
  async deleteRole(@Param('id') id: string) {
    await this.roleService.remove(id);
    return { deleted: true };
  }
}
