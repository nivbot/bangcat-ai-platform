import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { syncCats } from "../src/application/sync-cats.ts";
import { CatAssetRepository } from "../src/storage/cat-asset-repository.ts";
import { openDatabase } from "../src/storage/sqlite-database.ts";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/source-cats.json", import.meta.url), "utf8"),
);

test("sync is idempotent and updates changed source records", () => {
  const database = openDatabase(":memory:");
  const repository = new CatAssetRepository(database);

  const first = syncCats(repository, fixture);
  assert.equal(first.inserted, 2);
  assert.equal(first.errors, 0);

  const second = syncCats(repository, fixture);
  assert.equal(second.unchanged, 2);
  assert.equal(repository.list().length, 2);

  const changed = structuredClone(fixture);
  changed[0].description = "裤兜现在会主动坐到玻璃窗边。";
  changed[0].updatedAt = "2026-07-22T00:00:00.000Z";
  const third = syncCats(repository, changed);
  assert.equal(third.updated, 1);
  assert.equal(third.unchanged, 1);
  assert.equal(repository.getBySourceId("cat-pocket-001")?.publicDescription, changed[0].description);

  database.close();
});
