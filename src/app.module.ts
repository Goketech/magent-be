import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import {
  EffectModule,
  EffectValidationPipe,
  EffectRuntimeInterceptor,
} from '@nestjs-effect/core';

@Module({
  imports: [
    EffectModule.forRoot({
      autoServiceDiscovery: true,
      validation: {
        strict: true,
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: EffectValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: EffectRuntimeInterceptor,
    },
  ],
})
export class AppModule {}
