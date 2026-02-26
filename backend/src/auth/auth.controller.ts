import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Session,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';
import { createToken, verifyToken } from './token.util';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Session() session: Record<string, any>) {
    const user = await this.authService.login(loginDto);

    // Store user ID in session (for same-domain cookie-based auth)
    session.userId = user.id;

    // Also generate a token (for cross-domain token-based auth)
    const token = createToken(user.id);

    return {
      message: 'Login successful',
      user,
      token,
    };
  }

  // Registration endpoint removed - users must be created manually via scripts

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Session() session: Record<string, any>) {
    return new Promise((resolve, reject) => {
      session.destroy((err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ message: 'Logout successful' });
        }
      });
    });
  }

  @Get('me')
  async getCurrentUser(@Session() session: Record<string, any>, @Req() req: Request) {
    // First try session-based auth (same-domain cookies)
    let userId = session?.userId;

    // If no session, try token-based auth (cross-domain)
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        userId = verifyToken(token);
      }
    }

    if (!userId) {
      return null;
    }

    try {
      const user = await this.authService.validateSession(userId);
      return user;
    } catch (error) {
      return null;
    }
  }
}
