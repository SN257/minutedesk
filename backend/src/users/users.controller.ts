import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { Request } from 'express';
import { PasswordOtpService } from './password-otp.service';
import {
  CompletePasswordResetDto,
  VerifyProfilePasswordOtpDto,
} from './dto/password-otp.dto';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private passwordOtpService: PasswordOtpService,
  ) {}

  @Get()
  async search(@Query('query') query: string) {
    const all = await this.usersService.findAll();
    if (!query) {
      return all.map((u) => ({ id: u.id, name: u.name, email: u.email }));
    }
    const q = query.toLowerCase();
    return all
      .filter((u) => (u.name || '').toLowerCase().includes(q))
      .map((u) => ({ id: u.id, name: u.name, email: u.email }));
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  async updateProfile(
    @Req() req: Request,
    @Body() body: { name?: string; email?: string },
  ) {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.usersService.updateProfile(userId, body);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  @Post('change-password/request-otp')
  @UseGuards(AuthGuard)
  async requestPasswordChangeOtp(@Req() req: Request) {
    const userId = this.getAuthenticatedUserId(req);
    return this.passwordOtpService.requestProfilePasswordOtp(userId);
  }

  @Post('change-password/verify-otp')
  @UseGuards(AuthGuard)
  async verifyPasswordChangeOtp(
    @Req() req: Request,
    @Body() body: VerifyProfilePasswordOtpDto,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.passwordOtpService.verifyProfilePasswordOtp(userId, body.otp);
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Req() req: Request,
    @Body() body: CompletePasswordResetDto,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.passwordOtpService.completeProfilePasswordChange(
      userId,
      body.token,
      body.newPassword,
    );
  }

  private getAuthenticatedUserId(req: Request) {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return userId;
  }

  // ─── Super Admin endpoints ───────────────────────────────────────────────────

  @Get('admin/list')
  @UseGuards(SuperAdminGuard)
  async adminListUsers() {
    return this.usersService.adminFindAll();
  }

  @Post('admin/create')
  @UseGuards(SuperAdminGuard)
  async adminCreateUser(
    @Body() body: { email: string; password: string; name?: string; role?: string },
  ) {
    if (!body.email || !body.password) {
      throw new HttpException('Email and password are required', HttpStatus.BAD_REQUEST);
    }
    const existing = await this.usersService.findByEmail(body.email);
    if (existing) {
      throw new HttpException('User with this email already exists', HttpStatus.CONFLICT);
    }
    return this.usersService.adminCreateUser(body.email, body.password, body.name, body.role);
  }

  @Put('admin/:id')
  @UseGuards(SuperAdminGuard)
  async adminUpdateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; role?: string },
  ) {
    const user = await this.usersService.adminUpdateUser(id, body);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Delete('admin/:id')
  @UseGuards(SuperAdminGuard)
  async adminDeleteUser(@Param('id') id: string, @Req() req: Request) {
    const currentUserId = (req.session as any)?.userId;
    if (id === currentUserId) {
      throw new HttpException('Cannot delete your own account', HttpStatus.BAD_REQUEST);
    }
    const deleted = await this.usersService.adminDeleteUser(id);
    if (!deleted) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'User deleted successfully' };
  }
}
