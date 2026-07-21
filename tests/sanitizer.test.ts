import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sanitizeSourceCat } from "../src/domain/sanitize-source-cat.ts";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/source-cats.json", import.meta.url), "utf8"),
);

test("sanitizer copies only allowlisted fields and redacts sensitive text", () => {
  const result = sanitizeSourceCat(fixture[0]);
  assert.equal(result.asset.name, "裤兜");
  assert.equal(result.asset.sex, "male");
  assert.equal(result.asset.adoptionStatus, "available");
  assert.match(result.asset.publicRescueStory ?? "", /已脱敏手机号/);
  assert.equal(result.asset.media.length, 1);
  assert.deepEqual(result.excludedSourceFields.sort(), ["internalNotes", "rescuerPhone"]);
  assert.equal("rescuerPhone" in result.asset, false);
});

test("sanitizer rejects a record without stable source id", () => {
  assert.throws(() => sanitizeSourceCat({ name: "无编号猫" }), /id is required/);
});
