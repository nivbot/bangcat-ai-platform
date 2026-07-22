export interface DatabaseConnectionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function databaseOptions(prefix: 'AI' | 'SOURCE'): DatabaseConnectionOptions {
  return {
    host: process.env[`${prefix}_DB_HOST`] ?? '127.0.0.1',
    port: numberEnv(`${prefix}_DB_PORT`, 3306),
    user: process.env[`${prefix}_DB_USER`] ?? '',
    password: process.env[`${prefix}_DB_PASSWORD`] ?? '',
    database: process.env[`${prefix}_DB_NAME`] ?? '',
    connectionLimit: numberEnv(`${prefix}_DB_CONNECTION_LIMIT`, prefix === 'AI' ? 10 : 5),
  };
}

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    host: process.env.HOST ?? '0.0.0.0',
    port: numberEnv('PORT', 3010),
    defaultTenantId: process.env.DEFAULT_TENANT_ID ?? 'bangcat',
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN ?? '',
  },
  database: {
    ai: databaseOptions('AI'),
    source: databaseOptions('SOURCE'),
    sourceRequired: process.env.SOURCE_DB_REQUIRED === 'true',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379/0',
  },
  cos: {
    secretId: process.env.COS_SECRET_ID ?? '',
    secretKey: process.env.COS_SECRET_KEY ?? '',
    bucket: process.env.COS_BUCKET ?? '',
    region: process.env.COS_REGION ?? '',
    publicBaseUrl: process.env.COS_PUBLIC_BASE_URL ?? '',
  },
  providers: {
    text: process.env.TEXT_PROVIDER ?? 'mock',
    image: process.env.IMAGE_PROVIDER ?? 'mock',
    textModel: process.env.TEXT_MODEL ?? 'claude-sonnet-4-6',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    modelTimeoutMs: numberEnv('MODEL_TIMEOUT_MS', 60_000),
  },
});
