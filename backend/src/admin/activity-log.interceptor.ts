import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ActivityLogService } from './activity-log.service';
import { resolveUserIdFromRequest } from '../common/request-user.util';

// Only mutating requests are recorded as "activity" — GETs (including the
// heavy notification/dashboard polling this app does) would drown out the
// meaningful actions (created a meeting, deleted a user, logged in, ...).
const SKIP_METHODS = new Set(['GET', 'OPTIONS', 'HEAD']);

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(private readonly activityLogService: ActivityLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest();
    const method = request.method;
    if (SKIP_METHODS.has(method)) return next.handle();

    const start = Date.now();
    const path = request.originalUrl || request.url;
    const userId = resolveUserIdFromRequest(request);
    const ip = request.ip || request.headers?.['x-forwarded-for'];

    const log = (statusCode: number) => {
      this.activityLogService
        .record({ userId, method, path, statusCode, durationMs: Date.now() - start, ip })
        .catch(() => {});
    };

    return next.handle().pipe(
      tap(() => log(context.switchToHttp().getResponse()?.statusCode || 200)),
      catchError((err) => {
        log(err?.status || 500);
        return throwError(() => err);
      }),
    );
  }
}
