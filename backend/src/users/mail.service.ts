import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type PasswordOtpPurpose = 'profile_password_change' | 'forgot_password';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    if (!host) return;

    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendPasswordOtp(to: string, otp: string, purpose: PasswordOtpPurpose) {
    const isProfileChange = purpose === 'profile_password_change';
    const subject = isProfileChange
      ? 'Your MinuteDesk password change code'
      : 'Reset your MinuteDesk password';
    const action = isProfileChange ? 'change your password' : 'reset your password';

    if (!this.transporter) {
      if (process.env.NODE_ENV === 'production') {
        throw new InternalServerErrorException('Email service is not configured.');
      }

      this.logger.warn(
        `SMTP is not configured. Development OTP for ${to}: ${otp}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'MinuteDesk <no-reply@minutedesk.com>',
      to,
      subject,
      text: `Use ${otp} to ${action}. This code expires in 10 minutes. If you did not request this, ignore this email.`,
      html: `
        <div style="margin:0;padding:32px;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
            <div style="padding:24px 28px;background:#0f172a;color:#ffffff">
              <div style="font-size:18px;font-weight:800">MinuteDesk</div>
              <div style="font-size:13px;color:#cbd5e1;margin-top:6px">${subject}</div>
            </div>
            <div style="padding:28px">
              <p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:#334155">
                Enter this verification code to ${action}.
              </p>
              <div style="letter-spacing:10px;font-size:34px;font-weight:800;padding:18px 20px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;text-align:center;color:#0f172a">
                ${otp}
              </div>
              <p style="font-size:13px;line-height:1.6;margin:20px 0 0;color:#64748b">
                This code expires in 10 minutes. If you did not request this, you can safely ignore this email.
              </p>
            </div>
          </div>
        </div>
      `,
    });
  }
}
