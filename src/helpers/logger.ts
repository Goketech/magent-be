import { Logger as NestLogger } from '@nestjs/common';
import { Logger as EffectLogger, List, Option } from 'effect';

const createNestLogger = (context: string) => new NestLogger(context);

const logger = EffectLogger.make(({ logLevel, message, spans }) => {
  const toText = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(toText).join(' ');
    return String(value);
  };

  const text = toText(message);
  const head = List.head(spans);
  const context = Option.isSome(head) ? head.value.label : 'Effect';
  const nestLogger = createNestLogger(context);

  switch (logLevel._tag) {
    case 'Fatal':
      return nestLogger.fatal(text);
    case 'Error':
      return nestLogger.error(text);
    case 'Warning':
      return nestLogger.warn(text);
    case 'Info':
      return nestLogger.log(text);
    case 'Debug':
      return nestLogger.debug(text);
    case 'Trace':
    case 'All':
      return nestLogger.verbose(text);
    case 'None':
    default:
      return;
  }
});

export const loggerLayer = EffectLogger.replace(
  EffectLogger.defaultLogger,
  logger,
);
