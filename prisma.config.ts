import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/ai/schema.prisma',
  migrations: {
    path: 'prisma/ai/migrations',
  },
  datasource: {
    url: env('AI_DATABASE_URL'),
  },
});
