import * as SYS_MSG from './sys-msg';
import { Data, Effect } from 'effect';
import { camelToSnake } from './utils';
import { context, trace } from '@opentelemetry/api';
import { HttpException, HttpStatus } from '@nestjs/common';

// Effect-TS friendly error for HTTP scenarios
export class HttpError extends Data.TaggedError('HttpError')<{
  message: string;
  traceId: string;
  status: HttpStatus;
  cause?: unknown;
}> {}

export const errorToHttpException = (error: unknown): HttpException => {
  if (error instanceof HttpException) return error;
  if (error instanceof HttpError) {
    return new CustomHttpException(
      { message: error.message, traceId: error.traceId },
      error.status,
    );
  }
  return new CustomHttpException(
    SYS_MSG.INTERNAL_SERVER_ERROR,
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
};

// Map Effect failures to HttpException so Nest can handle them uniformly
export const mapEffectErrorToHttpException = <A, E>(
  eff: Effect.Effect<A, E>,
): Effect.Effect<A, HttpException> =>
  Effect.mapError(eff, errorToHttpException);

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
      const activeTraceId = trace
        .getSpan(context.active())
        ?.spanContext().traceId;
      return camelToSnake({
        message: (res.message ?? SYS_MSG.INTERNAL_SERVER_ERROR) as string,
        traceId: (res.traceId ??
          activeTraceId ??
          SYS_MSG.RESOURCE_FETCH_FAILED('Trace Id')) as string,
        timestamp: new Date().toISOString(),
      });
    }

    const activeTraceId = trace
      .getSpan(context.active())
      ?.spanContext().traceId;
    return camelToSnake({
      message: response as string,
      traceId: activeTraceId ?? SYS_MSG.RESOURCE_FETCH_FAILED('Trace Id'),
      timestamp: new Date().toISOString(),
    });
  }
}
