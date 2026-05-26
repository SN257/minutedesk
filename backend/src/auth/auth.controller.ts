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
import { PasswordOtpService } from '../users/password-otp.service';
import {
  CompletePasswordResetDto,
  RequestForgotPasswordOtpDto,
  VerifyForgotPasswordOtpDto,
} from '../users/dto/password-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private passwordOtpService: PasswordOtpService,
  ) { }

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

  @Post('forgot-password/request-otp')
  @HttpCode(HttpStatus.OK)
  async requestForgotPasswordOtp(@Body() body: RequestForgotPasswordOtpDto) {
    return this.passwordOtpService.requestForgotPasswordOtp(body.email);
  }

  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyForgotPasswordOtp(@Body() body: VerifyForgotPasswordOtpDto) {
    return this.passwordOtpService.verifyForgotPasswordOtp(body.email, body.otp);
  }

  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  async resetForgottenPassword(@Body() body: CompletePasswordResetDto) {
    return this.passwordOtpService.completeForgotPasswordReset(
      body.token,
      body.newPassword,
    );
  }

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
