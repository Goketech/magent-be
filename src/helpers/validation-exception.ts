import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
} from '@nestjs/common';
import { Effect } from 'effect';
import { Response } from 'express';
import * as SYS_MSG from './sys-msg';
import { Tracer } from '@effect/opentelemetry';

@Catch(HttpException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const status = exception.getStatus();
    const response = ctx.getResponse<Response>();
    const exceptionResponse = exception.getResponse();

    const body =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>)
        : { message: exception.message };

    const traceId =
      (body['traceId'] as string) ??
      Tracer.currentOtelSpan.pipe(
        Effect.map((span) => span.spanContext().traceId),
      );

    const message =
      (body['message'] as string) ?? SYS_MSG.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      message,
      traceId,
      timestamp: new Date().toISOString(),
    });
  }
}
