import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';

import { AppModule } from '../src/app.module';

const server = express();

let appPromise: Promise<INestApplication> | null = null;

async function bootstrap() {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(server),
        {
          logger:
            process.env.NODE_ENV === 'production'
              ? ['error', 'warn', 'log']
              : ['error', 'warn', 'log', 'debug'],
        },
      );

      app.set('trust proxy', 1);

      const configuredOrigins = (
        process.env.CORS_ORIGINS || ''
      )
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      app.enableCors({
        origin:
          configuredOrigins.length > 0
            ? configuredOrigins
            : true,
        credentials: true,
      });

      await app.init();

      return app;
    })();
  }

  return appPromise;
}

export default async function handler(
  req: any,
  res: any,
) {
  try {
    await bootstrap();

    return server(req, res);
  } catch (error: any) {
    console.error(
      'Vercel bootstrap failed:',
      error?.stack || error,
    );

    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        service: 'Support Command Center API',
        error: 'Backend bootstrap failed',
      });
    }
  }
}
