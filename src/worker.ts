import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';
import { startTelemetry, stopTelemetry } from './telemetry.js';

await startTelemetry();
const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
app.enableShutdownHooks();

const shutdown = async () => {
  await app.close();
  await stopTelemetry();
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
