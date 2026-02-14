import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Session,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Session() session: Record<string, any>) {
    const user = await this.authService.login(loginDto);
    
    // Store user ID in session
    session.userId = user.id;
    
    return {
      message: 'Login successful',
      user,
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
  async getCurrentUser(@Session() session: Record<string, any>) {
    // Check if user has a valid session without throwing errors
    if (!session || !session.userId) {
      return null; // Return null instead of throwing error - frontend will handle
    }
    
    try {
      const user = await this.authService.validateSession(session.userId);
      return user;
    } catch (error) {
      // If validation fails, return null instead of throwing
      return null;
    }
  }
}
