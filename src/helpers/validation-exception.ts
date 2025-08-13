import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
} from '@nestjs/common';
import { Response } from 'express';
import * as SYS_MSG from './sys-msg';
import { context as otelContext, trace } from '@opentelemetry/api';

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
      trace.getSpan(otelContext.active())?.spanContext().traceId ??
      SYS_MSG.RESOURCE_FETCH_FAILED('Trace Id');

    response.status(status).json({
      message: (body['message'] as string) ?? 'Error',
      traceId,
      timestamp: new Date().toISOString(),
    });
  }
}
