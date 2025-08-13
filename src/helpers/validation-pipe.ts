import * as SYS_MSG from './sys-msg';
import * as PR from 'effect/ParseResult';
import { HttpStatus } from '@nestjs/common';
import { Either, Schema as S } from 'effect';
import { CustomHttpException } from './exception';
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class ValidationPipe implements PipeTransform<unknown> {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const schema = metadata.metatype as unknown;
    if (schema && S.isSchema(schema)) {
      const decoded = S.decodeUnknownEither(
        schema as S.Schema<unknown, unknown, never>,
      )(value);
      if (Either.isRight(decoded)) {
        return decoded.right;
      }

      const issues = PR.ArrayFormatter.formatErrorSync(decoded.left);
      const missing: string[] = [];
      const invalid: string[] = [];

      for (const issue of issues) {
        const path = issue.path.map((p) => String(p)).join('.') || 'Payload';
        if (issue._tag === 'Missing') {
          if (!missing.includes(path)) missing.push(path);
        } else {
          if (!invalid.includes(path)) invalid.push(path);
        }
      }

      let message: string;
      const parts: string[] = [];
      if (missing.length === 1)
        parts.push(SYS_MSG.MISSING_REQUIRED_PARAMETER(missing[0]));
      if (missing.length > 1)
        parts.push(SYS_MSG.MISSING_REQUIRED_PARAMETERS(missing));
      if (invalid.length === 1)
        parts.push(SYS_MSG.INVALID_PARAMETER(invalid[0]));
      if (invalid.length > 1) parts.push(SYS_MSG.INVALID_PARAMETERS(invalid));
      message = parts.length > 0 ? parts.join('; ') : 'Validation failed';

      throw new CustomHttpException(message, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    // Non-schema payloads pass through
    throw new CustomHttpException(
      SYS_MSG.INVALID_PARAMETER('Payload'),
      HttpStatus.BAD_REQUEST,
    );
  }
}
