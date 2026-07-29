import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AuditException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Si es un contexto de microservicio / RPC, dejar pasar
    if (!response || typeof response.status !== 'function') {
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: unknown = 'Error interno del servidor';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      message = typeof resp === 'string' ? resp : (resp as Record<string, unknown>).message;
      error = exception.name;
    } else if (exception instanceof Error) {
      error = exception.name;
      message = exception.message;
      this.logger.error(`[AuditException] ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
