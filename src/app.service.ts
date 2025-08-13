import { Effect, Cause, Config } from 'effect';
import { Injectable, HttpStatus } from '@nestjs/common';
import { CustomHttpException } from './helpers/exception';

@Injectable()
export class AppService {
  getHello() {
    return Effect.gen(function* () {
      return yield* Effect.succeed({
        message: 'Hello',
        data: {
          version: yield* Config.string('npm_package_version'),
          uptime: process.uptime(),
          environment: yield* Config.string('NODE_ENV'),
        },
      });
    }).pipe(
      Effect.tapError((err) => Effect.logError(err, Cause.fail(err))),
      Effect.catchAll(() =>
        Effect.fail(
          new CustomHttpException(
            {
              message: 'Failed to get greeting',
              traceId: 'no-trace-id',
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        ),
      ),
      Effect.withSpan('getHello', { attributes: { message: 'Hello' } }),
    );
  }
}
