import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { verifyToken } from '../token.util';
import { UsersService } from '../../users/users.service';

/** Which admin-panel section each admin API belongs to. Anything not listed needs a super admin. */
const tabForPath = (rawUrl: string): string | null => {
  const p = rawUrl.split('?')[0].replace(/^\/+|\/+$/g, '');
  if (/^admin\/analytics\/users/.test(p)) return 'performance';
  if (/^admin\/analytics\//.test(p)) return 'overview';
  if (/^admin\/(activity|errors)/.test(p)) return 'logs';
  if (/^admin\/(backups|system|broadcasts)/.test(p)) return 'system';
  if (/^admin\/(settings|site-config|centers|roles|schema)/.test(p)) return 'setup';
  if (/^users\/admin/.test(p)) return 'people';
  return null;
};

/**
 * Admin-API guard. Super admins can do everything. Other roles (for example "admin") can use only
 * the admin sections a super admin switched on for them (users.adminTabs).
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Resolve userId from session or Bearer token
    let userId: string | undefined = request.session?.userId;

    if (!userId) {
      const authHeader = request.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        userId = verifyToken(token) ?? undefined;
        if (userId) {
          if (!request.session) request.session = {};
          request.session.userId = userId;
        }
      }
    }

    if (!userId) {
      throw new ForbiddenException('Unauthorized');
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new ForbiddenException('Unauthorized');
    if (user.role === 'super_admin') return true;

    const tab = tabForPath(String(request.originalUrl || request.url || ''));
    if (tab && user.role !== 'user' && Array.isArray(user.adminTabs) && user.adminTabs.includes(tab)) return true;

    throw new ForbiddenException('Super admin access required');
  }
}
