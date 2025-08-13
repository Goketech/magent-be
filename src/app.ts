import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import type { NestApplicationOptions } from '@nestjs/common';
import { Context, Config, Data, Effect, Layer } from 'effect';
import { NestExpressApplication } from '@nestjs/platform-express';

class ApplicationError extends Data.TaggedError('ApplicationError')<{
  cause?: unknown;
  message?: string;
}> {}

interface AppImpl {
  use: <T>(
    fn: (app: Awaited<ReturnType<typeof NestFactory.create>>) => T,
  ) => Effect.Effect<Awaited<T>, ApplicationError, never>;
}

export class App extends Context.Tag('App')<App, AppImpl>() {}

export const makeApp = (
  module: Parameters<typeof NestFactory.create>[0],
  options?: NestApplicationOptions,
) =>
  Effect.gen(function* () {
    const app = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => NestFactory.create<NestExpressApplication>(module, options),
        catch: (e) =>
          new ApplicationError({
            cause: e,
            message: 'Failed to initialize NestApplication',
          }),
      }),
      (app) => Effect.promise(() => app.close()),
    );
    return App.of({
      use: (fn) =>
        Effect.gen(function* () {
          const result = yield* Effect.try({
            try: () => fn(app),
            catch: (e) =>
              new ApplicationError({
                cause: e,
                message: 'Synchronous error in app',
              }),
          });
          if (result instanceof Promise) {
            return yield* Effect.tryPromise({
              try: () => result,
              catch: (e) =>
                new ApplicationError({
                  cause: e,
                  message: 'Asynchronous error in app',
                }),
            });
          } else {
            return result;
          }
        }),
    });
  });

export const layer = (
  module: Parameters<typeof NestFactory.create>[0],
  options?: NestApplicationOptions,
) => Layer.scoped(App, makeApp(module, options));

export const fromConfig = Layer.scoped(
  App,
  Effect.gen(function* () {
    return yield* makeApp(AppModule, { bufferLogs: true });
  }),
);

export const startApp = Effect.gen(function* () {
  const app = yield* App;
  const port = yield* Config.number('PORT');
  const nodeEnv = yield* Config.string('NODE_ENV');

  yield* app.use((app) => {
    app.setGlobalPrefix('api/v1', {
      exclude: ['/', 'health', 'api', 'api/v1', 'api/docs', 'probe'],
    });
    return app.listen(port);
  });

  yield* Effect.logInfo(`Server is running on port ${port} in ${nodeEnv} mode`);
}).pipe(
  Effect.withSpan('Application Startup'),
  Effect.withLogSpan('Application Startup'),
);
