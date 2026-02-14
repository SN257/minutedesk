import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

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

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Req() req: Request,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const result = await this.usersService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword,
    );

    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
    }

    return result;
  }
}
