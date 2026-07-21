import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createHttpServer } from "../src/http/server.ts";
import { CatAssetRepository } from "../src/storage/cat-asset-repository.ts";
import { openDatabase } from "../src/storage/sqlite-database.ts";
import { TopicEngineRepository } from "../src/storage/topic-engine-repository.ts";

test("topic routes require admin auth and create trend signals", async () => {
  const database = openDatabase(":memory:");
  const server = createHttpServer(new CatAssetRepository(database), {
    adminApiKey: "secret",
    topicRepository: new TopicEngineRepository(database),
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  const unauthorized = await fetch(`${base}/v1/topic/trends`);
  assert.equal(unauthorized.status, 401);

  const created = await fetch(`${base}/v1/topic/trends`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-api-key": "secret",
      "x-actor-id": "operator-1",
    },
    body: JSON.stringify({
      signalType: "seasonal",
      title: "毕业季",
      signalStrength: 0.8,
    }),
  });
  assert.equal(created.status, 201);
  const item = (await created.json()) as { title: string };
  assert.equal(item.title, "毕业季");

  const listed = await fetch(`${base}/v1/topic/trends`, {
    headers: { "x-admin-api-key": "secret" },
  });
  assert.equal(listed.status, 200);
  const body = (await listed.json()) as { items: unknown[] };
  assert.equal(body.items.length, 1);

  server.close();
  database.close();
});
