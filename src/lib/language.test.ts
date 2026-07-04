import { test } from "node:test";
import assert from "node:assert/strict";
import { languageName } from "./language";

test("languageName maps known codes", () => {
  assert.equal(languageName("en"), "English");
  assert.equal(languageName("fr"), "French");
  assert.equal(languageName("en_us"), "English (US)");
  assert.equal(languageName("en-US"), "English (US)");
});

test("languageName falls back to a base or upper-cased code", () => {
  assert.equal(languageName("en_gb"), "English"); // base match
  assert.equal(languageName("xx"), "XX");
  assert.equal(languageName(null), null);
  assert.equal(languageName(undefined), null);
});
