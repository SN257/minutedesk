import { verifyToken } from '../auth/token.util';

/**
 * Resolves the acting userId from either a session cookie or a Bearer token,
 * without requiring a guard to have run first (used by global interceptors/filters).
 */
export function resolveUserIdFromRequest(request: any): string | undefined {
  if (request?.session?.userId) return request.session.userId;

  const authHeader = request?.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyToken(token) ?? undefined;
  }

  return undefined;
}
