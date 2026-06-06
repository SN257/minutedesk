import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { UsersService } from './users.service';
import { MailService } from './mail.service';

type PasswordOtpPurpose = 'profile_password_change' | 'forgot_password';

type OtpRecord = {
  userId: string;
  email: string;
  hash: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
};

type VerifiedToken = {
  userId: string;
  purpose: PasswordOtpPurpose;
  expiresAt: number;
};

@Injectable()
export class PasswordOtpService {
  private readonly otpRecords = new Map<string, OtpRecord>();
  private readonly verifiedTokens = new Map<string, VerifiedToken>();
  private readonly otpTtlMs = 10 * 60 * 1000;
  private readonly verifiedTokenTtlMs = 10 * 60 * 1000;
  private readonly resendDelayMs = 60 * 1000;
  private readonly maxAttempts = 5;

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async requestProfilePasswordOtp(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found.');

    await this.issueOtp(user.id, user.email, 'profile_password_change');
    return {
      message: 'Verification code sent.',
      email: this.maskEmail(user.email),
    };
  }

  async requestForgotPasswordOtp(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('No registered account found for that email.');
    }

    await this.issueOtp(user.id, user.email, 'forgot_password');
    return {
      message: 'Verification code sent.',
      email: this.maskEmail(user.email),
    };
  }

  async verifyProfilePasswordOtp(userId: string, otp: string) {
    await this.ensureUserExists(userId);
    return this.verifyOtp(userId, 'profile_password_change', otp);
  }

  async verifyForgotPasswordOtp(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('No registered account found for that email.');
    }

    return this.verifyOtp(user.id, 'forgot_password', otp);
  }

  async completeProfilePasswordChange(
    userId: string,
    token: string,
    newPassword: string,
  ) {
    return this.completePasswordReset(
      userId,
      token,
      newPassword,
      'profile_password_change',
    );
  }

  async completeForgotPasswordReset(token: string, newPassword: string) {
    return this.completePasswordReset(
      undefined,
      token,
      newPassword,
      'forgot_password',
    );
  }

  private async issueOtp(
    userId: string,
    email: string,
    purpose: PasswordOtpPurpose,
  ) {
    this.cleanupExpired();

    const key = this.otpKey(userId, purpose);
    const existing = this.otpRecords.get(key);
    const now = Date.now();

    if (existing && now - existing.lastSentAt < this.resendDelayMs) {
      throw new BadRequestException(
        'Please wait before requesting another code.',
      );
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    this.otpRecords.set(key, {
      userId,
      email,
      hash: this.hashOtp(userId, purpose, otp),
      expiresAt: now + this.otpTtlMs,
      lastSentAt: now,
      attempts: 0,
    });

    try {
      await this.mailService.sendPasswordOtp(email, otp, purpose);
    } catch (err) {
      this.otpRecords.delete(key);
      throw new BadRequestException(
        'Failed to send verification email. Please check SMTP configuration.',
      );
    }
  }

  private async verifyOtp(
    userId: string,
    purpose: PasswordOtpPurpose,
    otp: string,
  ) {
    this.cleanupExpired();

    if (!/^\d{6}$/.test(otp || '')) {
      throw new BadRequestException('Enter the 6 digit verification code.');
    }

    const key = this.otpKey(userId, purpose);
    const record = this.otpRecords.get(key);
    if (!record) {
      throw new BadRequestException('Verification code expired. Request a new code.');
    }

    if (record.expiresAt < Date.now()) {
      this.otpRecords.delete(key);
      throw new BadRequestException('Verification code expired. Request a new code.');
    }

    const incomingHash = this.hashOtp(userId, purpose, otp);
    if (!this.safeEqual(record.hash, incomingHash)) {
      record.attempts += 1;
      if (record.attempts >= this.maxAttempts) {
        this.otpRecords.delete(key);
        throw new BadRequestException('Too many invalid attempts. Request a new code.');
      }

      throw new BadRequestException('Invalid verification code.');
    }

    this.otpRecords.delete(key);

    const token = crypto.randomBytes(32).toString('base64url');
    this.verifiedTokens.set(token, {
      userId,
      purpose,
      expiresAt: Date.now() + this.verifiedTokenTtlMs,
    });

    return {
      message: 'Verification successful.',
      token,
    };
  }

  private async completePasswordReset(
    expectedUserId: string | undefined,
    token: string,
    newPassword: string,
    purpose: PasswordOtpPurpose,
  ) {
    this.cleanupExpired();

    if (!token) throw new BadRequestException('Verification token is required.');
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }

    const verified = this.verifiedTokens.get(token);
    if (!verified || verified.purpose !== purpose) {
      throw new BadRequestException('Verification expired. Request a new code.');
    }

    if (verified.expiresAt < Date.now()) {
      this.verifiedTokens.delete(token);
      throw new BadRequestException('Verification expired. Request a new code.');
    }

    if (expectedUserId && verified.userId !== expectedUserId) {
      throw new BadRequestException('Verification token does not match this account.');
    }

    const updated = await this.usersService.setPassword(
      verified.userId,
      newPassword,
    );
    if (!updated) throw new BadRequestException('User not found.');

    this.verifiedTokens.delete(token);
    return { success: true, message: 'Password updated successfully.' };
  }

  private async ensureUserExists(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found.');
  }

  private otpKey(userId: string, purpose: PasswordOtpPurpose) {
    return `${purpose}:${userId}`;
  }

  private hashOtp(userId: string, purpose: PasswordOtpPurpose, otp: string) {
    const secret = process.env.SESSION_SECRET || 'your-secret-key';
    return crypto
      .createHash('sha256')
      .update(`${secret}:${purpose}:${userId}:${otp}`)
      .digest('hex');
  }

  private safeEqual(a: string, b: string) {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [key, record] of this.otpRecords.entries()) {
      if (record.expiresAt < now) this.otpRecords.delete(key);
    }
    for (const [token, record] of this.verifiedTokens.entries()) {
      if (record.expiresAt < now) this.verifiedTokens.delete(token);
    }
  }

  private maskEmail(email: string) {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;

    const visibleStart = localPart[0] || '*';
    const visibleEnd = localPart.length > 2 ? localPart[localPart.length - 1] : '';
    return `${visibleStart}${'*'.repeat(Math.min(Math.max(localPart.length - 1, 2), 5))}${visibleEnd}@${domain}`;
  }
}
