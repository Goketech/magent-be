import {
  Logger,
  Injectable,
  CallHandler,
  HttpException,
  NestInterceptor,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { Effect } from 'effect';
import { runtime } from '~/server';
import * as SYS_MSG from './sys-msg';
import { camelToSnake } from './utils';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Tracer } from '@effect/opentelemetry';
import { catchError, mergeMap } from 'rxjs/operators';
import { IS_PRIVATE_KEY } from '~/decorators/private';
import { Observable, from, of, throwError } from 'rxjs';

const DEFAULT_PRIVATE_FIELDS = ['password'];

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      mergeMap((res: unknown) => {
        if (Effect.isEffect(res)) {
          return from(
            runtime.runPromise(res as Effect.Effect<unknown, unknown, never>),
          ).pipe(mergeMap((value) => of(this.responseHandler(value, context))));
        }
        return of(this.responseHandler(res, context));
      }),
      catchError((err: unknown) => {
        const transformedError = this.errorHandler(err, context);
        return throwError(() => transformedError);
      }),
    );
  }

  errorHandler(exception: unknown, context: ExecutionContext): HttpException {
    const req = context.switchToHttp().getRequest<Request>();

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();

      if (typeof response === 'object') {
        const formattedResponse = camelToSnake({
          message:
            typeof response === 'object' && 'message' in response
              ? (response as Record<string, unknown>)['message']
              : exception.message,
          traceId:
            typeof response === 'object' && 'traceId' in response
              ? (response as Record<string, unknown>)['traceId']
              : (Tracer.currentOtelSpan.pipe(
                  Effect.map((span) => span.spanContext().traceId),
                ) ?? SYS_MSG.RESOURCE_FETCH_FAILED('Trace Id')),
          timestamp: new Date().toISOString(),
        });

        return new HttpException(formattedResponse, status);
      }

      return new HttpException(
        camelToSnake({
          message: exception.message,
          timestamp: new Date().toISOString(),
          traceId:
            Tracer.currentOtelSpan.pipe(
              Effect.map((span) => span.spanContext().traceId),
            ) ?? SYS_MSG.RESOURCE_FETCH_FAILED('Trace Id'),
        }),
        status,
      );
    }

    const errorMessage =
      exception instanceof Error ? exception.message : 'Unknown error';
    const errorStack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `Error processing request for ${req.method} ${req.url}, Message: ${errorMessage}, Stack: ${errorStack ?? 'Not available'}`,
    );

    return new InternalServerErrorException(
      camelToSnake({
        timestamp: new Date().toISOString(),
        message: SYS_MSG.INTERNAL_SERVER_ERROR,
        traceId:
          Tracer.currentOtelSpan.pipe(
            Effect.map((span) => span.spanContext().traceId),
          ) ?? SYS_MSG.RESOURCE_FETCH_FAILED('Trace Id'),
      }),
    );
  }

  responseHandler<T>(
    res: unknown,
    context: ExecutionContext,
  ): AbstractResponse<T> | unknown {
    const ctx = context.switchToHttp();
    if (res === undefined) {
      this.logger.warn(
        `Response is undefined for ${
          ctx.getRequest<Request>().url
        }, skipping interceptor response handling.`,
      );
      return res;
    }

    const response = ctx.getResponse<Response>();
    if (response.headersSent) {
      this.logger.warn(
        `Response headers already sent for ${
          ctx.getRequest<Request>().url
        }, skipping interceptor response handling.`,
      );
      return res;
    }

    response.setHeader('Content-Type', 'application/json');

    if (typeof res === 'object' && res !== null) {
      const { message, data, meta } = res as AbstractResponse<T>;

      const processedData = data
        ? this.removePrivateFields(data, context)
        : undefined;

      return camelToSnake({
        message: message || 'Success',
        data: processedData ? processedData : undefined,
        meta: meta || undefined,
        timestamp: new Date().toISOString(),
      }) as AbstractResponse<T>;
    }

    return camelToSnake({
      message: 'Success',
      data: res as T,
      timestamp: new Date().toISOString(),
    }) as AbstractResponse<T>;
  }

  private removePrivateFields(
    data: unknown,
    context: ExecutionContext,
  ): unknown {
    if (Array.isArray(data)) {
      return data.map((item) => this.removePrivateFields(item, context));
    }

    if (data === null || typeof data !== 'object') {
      return data;
    }

    const result = { ...data } as Record<string, unknown>;

    const decoratorPrivateFields =
      this.reflector.get<string[]>(IS_PRIVATE_KEY, context.getHandler()) || [];

    const privateFields = [
      ...DEFAULT_PRIVATE_FIELDS,
      ...decoratorPrivateFields,
    ];

    const filteredResult: Record<string, unknown> = {};

    Object.keys(result).forEach((key) => {
      if (!privateFields.includes(key)) {
        filteredResult[key] = result[key];
      }
    });

    for (const key in filteredResult) {
      if (
        typeof filteredResult[key] === 'object' &&
        !(filteredResult[key] instanceof Date) &&
        filteredResult[key] !== null
      ) {
        filteredResult[key] = this.removePrivateFields(
          filteredResult[key],
          context,
        );
      }
    }

    return filteredResult;
  }
}
