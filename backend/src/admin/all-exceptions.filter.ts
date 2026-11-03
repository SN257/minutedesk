import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { ErrorLogService } from './error-log.service';
import { resolveUserIdFromRequest } from '../common/request-user.util';

// Global filter so unhandled/500-level errors land in the Admin Center's error
// log ("tickets") instead of only being visible in server console output.
// Expected 4xx HttpExceptions (validation, forbidden, not found, ...) are
// normal application flow and are NOT logged as errors — only genuine bugs are.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  constructor(private readonly errorLogService: ErrorLogService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : 500;
    const body = isHttp ? exception.getResponse() : { message: (exception as any)?.message || 'Internal server error' };

    if (status >= 500) {
      this.logger.error((exception as any)?.message || exception, (exception as any)?.stack);
      this.errorLogService
        .record({
          source: 'backend',
          message: (exception as any)?.message || 'Unknown error',
          stack: (exception as any)?.stack,
          path: request?.originalUrl || request?.url,
          userId: resolveUserIdFromRequest(request),
          statusCode: status,
        })
        .catch(() => {});
    }

    response.status(status).json(typeof body === 'string' ? { message: body } : body);
  }
}
