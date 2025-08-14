import { Effect } from 'effect';
import { runtime } from '~/server';
import * as SYS_MSG from './sys-msg';
import { camelToSnake } from './utils';
import { Tracer } from '@effect/opentelemetry';
import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomHttpException extends HttpException {
  constructor(response: string | Record<string, unknown>, status: HttpStatus) {
    super({ message: response }, status);
  }

  getResponse(): {
    message: string;
    traceId?: string;
    timestamp?: string;
  } {
    const response = super.getResponse();

    if (typeof response === 'object' && response !== null) {
      const res = response as Record<string, unknown>;
      const activeTraceId = runtime.runSync(
        Tracer.currentOtelSpan.pipe(
          Effect.map((span) => span.spanContext().traceId),
          Effect.orElseSucceed(() => SYS_MSG.RESOURCE_FETCH_FAILED('Trace Id')),
        ),
      );
      return camelToSnake({
        message: (res.message ?? SYS_MSG.INTERNAL_SERVER_ERROR) as string,
        traceId: (res.traceId ?? activeTraceId) as string,
        timestamp: new Date().toISOString(),
      });
    }

    const activeTraceId = runtime.runSync(
      Tracer.currentOtelSpan.pipe(
        Effect.map((span) => span.spanContext().traceId),
        Effect.orElseSucceed(() => SYS_MSG.RESOURCE_FETCH_FAILED('Trace Id')),
      ),
    );
    return camelToSnake({
      message: response as string,
      traceId: activeTraceId,
      timestamp: new Date().toISOString(),
    });
  }
}
