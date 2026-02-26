import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { verifyToken } from '../token.util';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Check session-based auth first (same-domain cookies)
    if (request.session && request.session.userId !== undefined) {
      return true;
    }

    // Fall back to token-based auth (cross-domain Bearer token)
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const userId = verifyToken(token);
      if (userId) {
        // Inject userId into session object so controllers can access it
        if (!request.session) request.session = {};
        request.session.userId = userId;
        return true;
      }
    }

    return false;
  }
}
