import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private smtpUser: string;
  private smtpFrom: string;

  constructor(private readonly config: ConfigService) {
    this.smtpUser = this.config.get<string>('SMTP_USER', '');
    this.smtpFrom = this.config.get<string>('SMTP_FROM', '') || this.smtpUser;
    const smtpPass = this.config.get<string>('SMTP_PASS', '');
    const smtpHost = this.config.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const smtpPort = parseInt(this.config.get<string>('SMTP_PORT', '587'), 10);
    const smtpSecure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';

    if (this.smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: this.smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log(`Mail transport configured for ${this.smtpUser}`);
    } else {
      this.logger.warn('SMTP credentials not configured — email notifications disabled');
    }
  }

  async sendNotificationEmail(
    to: string,
    title: string,
    body?: string,
    meta?: any,
  ): Promise<void> {
    if (!this.transporter) return;

    const html = this.buildEmailHTML(title, body, meta);

    try {
      await this.transporter.sendMail({
        from: `"Nexus" <${this.smtpFrom}>`,
        to,
        subject: title,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${title}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err?.message}`);
    }
  }

  private buildEmailHTML(title: string, body?: string, meta?: any): string {
    const type = meta?.type || 'general';
    
    let contentHTML = '';

    switch (type) {
      case 'task_assigned':
        contentHTML = this.taskAssignedTemplate(title, body, meta);
        break;
      case 'due_date_alert':
        contentHTML = this.dueAlertTemplate(title, body, meta);
        break;
      case 'task_overdue':
        contentHTML = this.overdueTemplate(title, body, meta);
        break;
      case 'meeting_reminder':
        contentHTML = this.meetingReminderTemplate(title, body, meta);
        break;
      case 'work_log_reminder':
        contentHTML = this.workLogReminderTemplate(title, body, meta);
        break;
      case 'missed_work_log':
        contentHTML = this.missedWorkLogTemplate(title, body, meta);
        break;
      default:
        contentHTML = this.defaultTemplate(title, body);
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(title)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #2c3e50; background: #f5f6f7; }
          .wrapper { background: #f5f6f7; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); padding: 36px 24px; }
          .header-content { text-align: center; }
          .logo { font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.8px; }
          .content { padding: 36px 24px; }
          .content-title { font-size: 22px; font-weight: 700; color: #2c3e50; margin: 0 0 8px; }
          .content-subtitle { font-size: 14px; color: #7f8c8d; margin: 0 0 28px; font-weight: 500; }
          .details-box { background: #f5f6f7; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 5px solid #16a085; }
          .detail-row { margin: 16px 0; }
          .detail-row:first-child { margin-top: 0; }
          .detail-label { font-size: 11px; font-weight: 800; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 6px; }
          .detail-value { font-size: 15px; color: #2c3e50; font-weight: 600; }
          .badge { display: inline-block; padding: 6px 14px; border-radius: 5px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; }
          .badge-urgent { background: #e74c3c; color: #ffffff; }
          .badge-high { background: #e67e22; color: #ffffff; }
          .badge-medium { background: #f39c12; color: #ffffff; }
          .badge-low { background: #27ae60; color: #ffffff; }
          .info-section { background: #ecf0f1; border-radius: 8px; padding: 18px; margin: 24px 0; border-left: 5px solid #2980b9; }
          .info-section p { font-size: 14px; color: #2c3e50; margin: 0; font-weight: 500; }
          .alert-section { background: #fadbd8; border-radius: 8px; padding: 18px; margin: 24px 0; border-left: 5px solid #c0392b; }
          .alert-section p { font-size: 14px; color: #7b241c; margin: 0; font-weight: 600; }
          .cta-button { display: inline-block; padding: 14px 32px; background: #16a085; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 15px; margin: 24px 0; }
          .cta-button:hover { background: #138d75; }
          .footer { background: #f5f6f7; padding: 24px; border-top: 1px solid #ecf0f1; text-align: center; }
          .footer-text { font-size: 12px; color: #95a5a6; margin: 0; }
          .footer-link { color: #16a085; text-decoration: none; font-weight: 600; }
          .footer-link:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="header-content">
                <div class="logo">Nexus</div>
              </div>
            </div>
            <div class="content">
              ${contentHTML}
            </div>
            <div class="footer">
              <p class="footer-text">You received this notification from Nexus. <a href="https://nexus.app?returnUrl=/" class="footer-link">Open Nexus</a></p>
              <p class="footer-text" style="margin-top: 10px;">© 2026 Nexus. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private taskAssignedTemplate(title: string, body?: string, meta?: any): string {
    const cardId = meta?.cardId || '';
    const viewTaskUrl = cardId ? `https://nexus.app/login?returnUrl=/task/${cardId}` : 'https://nexus.app/login?returnUrl=/boards';
    
    return `
      <h2 class="content-title">Task Assignment</h2>
      <p class="content-subtitle">A new task has been assigned to you</p>
      
      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Task</span>
          <span class="detail-value">${escapeHtml(title)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Description</span>
          <span class="detail-value">${escapeHtml(body || 'No description provided')}</span>
        </div>
        ${meta?.assignedBy ? `<div class="detail-row">
          <span class="detail-label">Assigned By</span>
          <span class="detail-value">${escapeHtml(meta.assignedBy)}</span>
        </div>` : ''}
        ${meta?.dueDate ? `<div class="detail-row">
          <span class="detail-label">Due Date</span>
          <span class="detail-value">${escapeHtml(meta.dueDate)}</span>
        </div>` : ''}
        ${meta?.priority ? `<div class="detail-row">
          <span class="detail-label">Priority</span>
          <span class="badge badge-${meta.priority}">${escapeHtml(meta.priority)}</span>
        </div>` : ''}
      </div>

      <p style="text-align: center;">
        <a href="${viewTaskUrl}" class="cta-button">View Task</a>
      </p>
      <p style="font-size: 13px; color: #7f8c8d; text-align: center;">Log in to review the full task details and begin working on it.</p>
    `;
  }

  private dueAlertTemplate(title: string, body?: string, meta?: any): string {
    const cardId = meta?.cardId || '';
    const viewTaskUrl = cardId ? `https://nexus.app/login?returnUrl=/task/${cardId}` : 'https://nexus.app/login?returnUrl=/boards';
    
    return `
      <h2 class="content-title">Task Due Today</h2>
      <p class="content-subtitle">You have a task due before end of day</p>
      
      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Task</span>
          <span class="detail-value">${escapeHtml(body || 'Task due today')}</span>
        </div>
        ${meta?.dueDate ? `<div class="detail-row">
          <span class="detail-label">Due Date</span>
          <span class="detail-value">${escapeHtml(meta.dueDate)}</span>
        </div>` : ''}
      </div>

      <div class="info-section">
        <p>Complete this task before the end of the business day to stay on schedule.</p>
      </div>

      <p style="text-align: center;">
        <a href="${viewTaskUrl}" class="cta-button">View Task</a>
      </p>
    `;
  }

  private overdueTemplate(title: string, body?: string, meta?: any): string {
    const cardId = meta?.cardId || '';
    const viewTaskUrl = cardId ? `https://nexus.app/login?returnUrl=/task/${cardId}` : 'https://nexus.app/login?returnUrl=/boards';
    
    return `
      <h2 class="content-title">Task Overdue</h2>
      <p class="content-subtitle">This task has passed its due date</p>
      
      <div class="alert-section">
        <p>Action Required: Please complete this task as soon as possible</p>
      </div>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Task</span>
          <span class="detail-value">${escapeHtml(body || 'Overdue task')}</span>
        </div>
        ${meta?.dueDate ? `<div class="detail-row">
          <span class="detail-label">Was Due</span>
          <span class="detail-value">${escapeHtml(meta.dueDate)}</span>
        </div>` : ''}
      </div>

      <p style="text-align: center;">
        <a href="${viewTaskUrl}" class="cta-button">Complete Now</a>
      </p>
    `;
  }

  private meetingReminderTemplate(title: string, body?: string, meta?: any): string {
    const meetingId = meta?.meetingId || '';
    const meetingUrl = meetingId ? `https://nexus.app/login?returnUrl=/meetings/${meetingId}` : 'https://nexus.app/login?returnUrl=/meetings';
    
    return `
      <h2 class="content-title">Meeting Starting Soon</h2>
      <p class="content-subtitle">Your meeting is starting in approximately 15 minutes</p>
      
      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Meeting</span>
          <span class="detail-value">${escapeHtml(title)}</span>
        </div>
        ${meta?.date ? `<div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${escapeHtml(meta.date)}</span>
        </div>` : ''}
        ${meta?.startTime ? `<div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${escapeHtml(meta.startTime)}</span>
        </div>` : ''}
      </div>

      <div class="info-section">
        <p>${escapeHtml(body || 'Please be ready to join the meeting')}</p>
      </div>

      <p style="text-align: center;">
        <a href="${meetingUrl}" class="cta-button">Join Meeting</a>
      </p>
    `;
  }

  private workLogReminderTemplate(title: string, body?: string, meta?: any): string {
    const today = new Date().toISOString().split('T')[0];
    const workLogUrl = `https://nexus.app/login?returnUrl=/work-logs?date=${today}`;
    
    return `
      <h2 class="content-title">Daily Work Log Reminder</h2>
      <p class="content-subtitle">Don't forget to log your work for today</p>
      
      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Reminder</span>
          <span class="detail-value">Please update your work log to maintain accurate records</span>
        </div>
        ${meta?.date ? `<div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${escapeHtml(meta.date)}</span>
        </div>` : ''}
      </div>

      <div class="info-section">
        <p>Logging your work helps track progress and keeps the team informed of your activities.</p>
      </div>

      <p style="text-align: center;">
        <a href="${workLogUrl}" class="cta-button">Log Work</a>
      </p>
    `;
  }

  private missedWorkLogTemplate(title: string, body?: string, meta?: any): string {
    const missedDate = meta?.missedDate || new Date().toISOString().split('T')[0];
    const workLogUrl = `https://nexus.app/login?returnUrl=/work-logs?date=${missedDate}`;
    
    return `
      <h2 class="content-title">Missing Work Log</h2>
      <p class="content-subtitle">You haven't logged work for a recent date</p>
      
      <div class="alert-section">
        <p>Please Update: Complete your work log for the missing date</p>
      </div>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Reminder</span>
          <span class="detail-value">${escapeHtml(body || 'Update your work log')}</span>
        </div>
        ${meta?.missedDate ? `<div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${escapeHtml(meta.missedDate)}</span>
        </div>` : ''}
      </div>

      <p style="text-align: center;">
        <a href="${workLogUrl}" class="cta-button">Update Work Log</a>
      </p>
    `;
  }

  private defaultTemplate(title: string, body?: string): string {
    return `
      <h2 class="content-title">${escapeHtml(title)}</h2>
      
      <div class="details-box">
        <p style="margin: 0; color: #2c3e50;">${escapeHtml(body || 'You have a new notification from Nexus')}</p>
      </div>

      <p style="text-align: center;">
        <a href="https://nexus.app/login?returnUrl=/" class="cta-button">Open Nexus</a>
      </p>
    `;
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
