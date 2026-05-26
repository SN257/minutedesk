import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { verifyToken } from '../token.util';
import { UsersService } from '../../users/users.service';

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
    if (!user || user.role !== 'super_admin') {
      throw new ForbiddenException('Super admin access required');
    }

    return true;
  }
}
