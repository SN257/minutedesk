import { Injectable, NestMiddleware } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { resolveUserIdFromRequest } from './request-user.util';

/** Which page each API area belongs to. Anything not listed here is never blocked. */
const AREA_PAGE: Record<string, string> = {
  meetings: 'meetings',
  'scheduled-meetings': 'meetings',
  tasks: 'tasks',
  boards: 'tasks',
  'work-logs': 'worklog',
};

/**
 * Enforces each person's "allowed pages". A user whose allowedPages is a list can only use the
 * APIs of those pages; null means everything, and super admins are never limited.
 */
@Injectable()
export class PageAccessMiddleware implements NestMiddleware {
  constructor(private readonly users: UsersService) {}

  async use(req: any, res: any, next: () => void) {
    const area = String(req.originalUrl || req.url || '').split('?')[0].split('/').filter(Boolean)[0];
    const page = area ? AREA_PAGE[area] : undefined;
    if (!page) return next();

    const userId = resolveUserIdFromRequest(req);
    if (!userId) return next(); // the route's own guard answers for signed-out requests

    const user = await this.users.findById(userId).catch(() => null);
    if (user && user.role !== 'super_admin' && Array.isArray(user.allowedPages) && !user.allowedPages.includes(page)) {
      return res.status(403).json({ statusCode: 403, message: 'You do not have access to this page.' });
    }
    next();
  }
}
