import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ExceptionBody {
  message: string | string[];
  error?: string;
  statusCode: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProduction = process.env.NODE_ENV === 'production';

    let status: number;
    let message: string | string[] = 'Error interno del servidor';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as ExceptionBody | string;
      if (typeof body === 'string') {
        message = body;
        error = exception.name;
      } else {
        message = body.message;
        error = body.error ?? exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = isProduction ? 'Error interno del servidor' : exception.message;
      error = isProduction ? undefined : exception.name;
      this.logger.error(exception.message, exception.stack);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    const body: Record<string, unknown> = { statusCode: status };
    if (message !== undefined) body.message = message;
    if (!isProduction) {
      if (error !== undefined) body.error = error;
      body.path = request.url;
      body.method = request.method;
      body.timestamp = new Date().toISOString();
    }

    response.status(status).json(body);
  }
}
