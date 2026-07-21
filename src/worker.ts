import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { startTelemetry, stopTelemetry } from './telemetry.js';

await startTelemetry();
const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
app.enableShutdownHooks();

const shutdown = async () => {
  await app.close();
  await stopTelemetry();
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
