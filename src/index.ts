import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { openDatabase } from "./storage/sqlite-database.ts";
import { CatAssetRepository } from "./storage/cat-asset-repository.ts";
import { TopicEngineRepository } from "./storage/topic-engine-repository.ts";
import { createHttpServer } from "./http/server.ts";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);
const databasePath = resolve(process.env.AI_DATABASE_PATH ?? "./data/bangcat-ai.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

const database = openDatabase(databasePath);
const repository = new CatAssetRepository(database);
const topicRepository = new TopicEngineRepository(database);
const server = createHttpServer(repository, {
  adminApiKey: process.env.ADMIN_API_KEY,
  topicRepository,
});

server.listen(port, host, () => {
  console.log(`Bangcat AI API listening on http://${host}:${port}`);
  console.log(`AI asset database: ${databasePath}`);
});

function shutdown(): void {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
