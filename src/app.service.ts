import { Injectable } from '@nestjs/common';
import { Tracer } from '@effect/opentelemetry';
import { Effect, Cause, Config } from 'effect';

@Injectable()
export class AppService {
  getHello() {
    return Effect.gen(function* () {
      const span = yield* Tracer.currentOtelSpan;
      return yield* Effect.succeed({
        message: 'Server is alive!',
        data: {
          uptime: process.uptime(),
          traceId: span.spanContext().traceId,
          environment: yield* Config.string('NODE_ENV'),
          version: yield* Config.string('npm_package_version'),
        },
      }).pipe(Effect.tap((res) => Effect.annotateCurrentSpan(res)));
    }).pipe(
      Effect.withSpan('AppService.getHello'),
      Effect.tapError((err) => Effect.logError(err, Cause.fail(err))),
    );
  }
}
