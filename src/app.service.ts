import { Injectable } from '@nestjs/common';
import { Tracer } from '@effect/opentelemetry';
import { Effect, Cause, Config } from 'effect';

@Injectable()
export class AppService {
  getHello() {
    return Effect.gen(function* () {
      const span = yield* Tracer.currentOtelSpan;
      return yield* Effect.succeed({
        message: 'Hello',
        data: {
          uptime: process.uptime(),
          traceId: span.spanContext().traceId ?? 'no-trace-id',
          version: yield* Config.string('npm_package_version'),
          environment: yield* Config.string('NODE_ENV'),
        },
      });
    }).pipe(
      Effect.withSpan('getHello'),
      Effect.tapError((err) => Effect.logError(err, Cause.fail(err))),
    );
  }
}
