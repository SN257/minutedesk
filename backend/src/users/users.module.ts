import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { MailService } from './mail.service';
import { PasswordOtpService } from './password-otp.service';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, MailService, PasswordOtpService, SuperAdminGuard],
  controllers: [UsersController],
  exports: [UsersService, PasswordOtpService],
})
export class UsersModule {}
