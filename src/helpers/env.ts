import { Data, Effect, Schema as S } from 'effect';

const EnvSchema = S.Struct({
  PORT: S.NumberFromString,
  NODE_ENV: S.Literal('test', 'local', 'staging', 'development', 'production'),
  AXIOM_API_KEY: S.String,
  AXIOM_DATASET: S.String,
});

export type EnvVariables = S.Schema.Type<typeof EnvSchema>;

class EnvValidationError extends Data.TaggedError('EnvValidationError')<{
  cause?: unknown;
  message?: string;
}> {}

export const validateEnv = (config: Record<string, unknown>) =>
  Effect.gen(function* () {
    return yield* Effect.try({
      try: () => S.decodeUnknownSync(EnvSchema)(config),
      catch: (err) =>
        new EnvValidationError({
          cause: err,
          message: 'Invalid environment variables',
        }),
    });
  });
