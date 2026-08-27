import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const start = Date.now();
    const { method, url, ip } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(`${method} ${url} - ${duration}ms - IP: ${ip}`);
        },
        error: (error: Error) => {
          const duration = Date.now() - start;
          this.logger.error(
            `${method} ${url} - ${duration}ms - ERROR: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}