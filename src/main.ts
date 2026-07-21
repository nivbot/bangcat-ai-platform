import 'reflect-metadata';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor.js';
import { startTelemetry, stopTelemetry } from './telemetry.js';

await startTelemetry();

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: true }),
  { bufferLogs: true },
);

await app.register(helmet);
await app.register(cors, { origin: false });
app.setGlobalPrefix('v1', { exclude: ['health'] });
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
app.useGlobalInterceptors(new ApiResponseInterceptor());
app.enableShutdownHooks();

const config = app.get(ConfigService);
const host = config.get<string>('app.host') ?? '0.0.0.0';
const port = config.get<number>('app.port') ?? 3010;
await app.listen(port, host);

const shutdown = async () => {
  await app.close();
  await stopTelemetry();
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
