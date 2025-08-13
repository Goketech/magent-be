import * as App from './app';
import { validateEnv } from './helpers/env';
import { loggerLayer } from './helpers/logger';
import { ManagedRuntime, Effect, Logger, LogLevel, Cause, Layer } from 'effect';
import { NodeSdkLive } from './helpers/instrumentation';

const app = Effect.gen(function* () {
  yield* App.startApp;
  yield* validateEnv(process.env).pipe(
    Effect.tapError((err) => Effect.logError(err, Cause.fail(err))),
    Effect.catchAll(() => Effect.sync(() => process.exit(1))),
  );
  yield* Effect.never;
});

const appLayer = Layer.mergeAll(loggerLayer, App.fromConfig, NodeSdkLive);

export const runtime = ManagedRuntime.make(appLayer);

app.pipe(
  Effect.provide(appLayer),
  Logger.withMinimumLogLevel(LogLevel.All),
  runtime.runPromise,
);
