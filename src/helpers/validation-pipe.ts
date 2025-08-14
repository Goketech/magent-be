import { runtime } from '~/server';
import * as SYS_MSG from './sys-msg';
import * as PR from 'effect/ParseResult';
import { HttpStatus } from '@nestjs/common';
import { Tracer } from '@effect/opentelemetry';
import { CustomHttpException } from './exception';
import { Either, Effect, Schema as S } from 'effect';
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class ValidationPipe implements PipeTransform<unknown> {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    return runtime.runSync(
      Effect.gen(function* () {
        const schema = metadata.metatype as unknown;

        if (!schema || !S.isSchema(schema)) {
          yield* Tracer.currentOtelSpan.pipe(
            Effect.tap((span) =>
              Effect.sync(() => {
                span.addEvent('validation.no_schema');
              }),
            ),
            Effect.orElseSucceed(() => undefined),
          );
          return new CustomHttpException(
            {
              message: SYS_MSG.INVALID_PARAMETER('Payload'),
              traceId: Tracer.currentOtelSpan.pipe(
                Effect.map((span) => span.spanContext().traceId),
              ),
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        const schemaName =
          (schema as { description?: string }).description ??
          (schema as { ast?: { identifier?: string } }).ast?.identifier ??
          (schema as { name?: string }).name ??
          'anonymous';

        const decoded = yield* Effect.suspend(() =>
          Effect.sync(() =>
            S.decodeUnknownEither(schema as S.Schema<unknown, unknown, never>)(
              value,
            ),
          ).pipe(
            Effect.flatMap((e) =>
              Either.isRight(e) ? Effect.succeed(e.right) : Effect.fail(e.left),
            ),
          ),
        );

        yield* Tracer.currentOtelSpan.pipe(
          Effect.tap((span) =>
            Effect.sync(() => {
              span.addEvent('validation.success');
              span.setAttribute('validation.schema', String(schemaName));
            }),
          ),
          Effect.orElseSucceed(() => undefined),
        );

        return decoded;
      }).pipe(
        Effect.catchAll((parseError) =>
          Effect.gen(function* () {
            const issues = PR.ArrayFormatter.formatErrorSync(parseError);
            const missing: string[] = [];
            const invalid: string[] = [];

            for (const issue of issues) {
              const path =
                issue.path.map((p) => String(p)).join('.') || 'Payload';
              if (issue._tag === 'Missing') {
                if (!missing.includes(path)) missing.push(path);
              } else {
                if (!invalid.includes(path)) invalid.push(path);
              }
            }

            const parts: string[] = [];
            if (missing.length === 1)
              parts.push(SYS_MSG.MISSING_REQUIRED_PARAMETER(missing[0]));
            if (missing.length > 1)
              parts.push(SYS_MSG.MISSING_REQUIRED_PARAMETERS(missing));
            if (invalid.length === 1)
              parts.push(SYS_MSG.INVALID_PARAMETER(invalid[0]));
            if (invalid.length > 1)
              parts.push(SYS_MSG.INVALID_PARAMETERS(invalid));
            const message =
              parts.length > 0 ? parts.join('; ') : 'Validation failed';

            yield* Tracer.currentOtelSpan.pipe(
              Effect.tap((span) =>
                Effect.sync(() => {
                  span.addEvent('validation.failure', { message });
                  span.setAttribute('validation.missing.count', missing.length);
                  span.setAttribute('validation.invalid.count', invalid.length);
                }),
              ),
              Effect.orElseSucceed(() => undefined),
            );

            return Effect.sync(() => {
              return new CustomHttpException(
                {
                  message,
                  traceId: Tracer.currentOtelSpan.pipe(
                    Effect.map((span) => span.spanContext().traceId),
                  ),
                },
                HttpStatus.UNPROCESSABLE_ENTITY,
              );
            });
          }).pipe(Effect.flatten),
        ),
        Effect.withSpan('ValidationPipe.transform'),
      ),
    );
  }
}
