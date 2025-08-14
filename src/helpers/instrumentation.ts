import packageJson from '../../package.json';
import { NodeSdk } from '@effect/opentelemetry';
import { Cause, Config, Data, Effect } from 'effect';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

class TraceExporterError extends Data.TaggedError('TraceExporterError')<{
  cause?: unknown;
  message?: string;
}> {}

const traceExporter = Effect.gen(function* () {
  const apiKey = yield* Config.string('AXIOM_API_KEY');
  const datasetName = yield* Config.string('AXIOM_DATASET');

  return yield* Effect.try({
    try: () =>
      new OTLPTraceExporter({
        url: 'https://api.axiom.co/v1/traces',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-Axiom-Dataset': datasetName,
        },
      }),
    catch: (err) =>
      new TraceExporterError({
        cause: err,
        message: 'Failed to create trace exporter',
      }),
  });
});

const serviceName = packageJson.name ?? 'unknown';
const serviceVersion = packageJson.version ?? 'unknown';

export const NodeSdkLive = NodeSdk.layer(
  traceExporter.pipe(
    Effect.map((exporter) => ({
      resource: { serviceName, serviceVersion },
      spanProcessor: new BatchSpanProcessor(exporter),
    })),
    Effect.catchAllCause((cause) =>
      Effect.logWarning('Tracing disabled', Cause.fail(cause)).pipe(
        Effect.as({
          resource: { serviceName, serviceVersion },
        }),
      ),
    ),
    Effect.withSpan('OpenTelemetry SDK Configuration'),
    Effect.withLogSpan('OpenTelemetry SDK Configuration'),
  ),
);
