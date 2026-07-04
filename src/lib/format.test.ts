import { test } from "node:test";
import assert from "node:assert/strict";
import { relativeTime, humanDuration, humanBytes, humanTotalTime } from "./format";

test("relativeTime buckets by age", () => {
  const now = new Date("2026-07-04T12:00:00Z");
  assert.equal(relativeTime(new Date("2026-07-04T11:59:30Z"), now), "just now");
  assert.equal(relativeTime(new Date("2026-07-04T11:30:00Z"), now), "30m ago");
  assert.equal(relativeTime(new Date("2026-07-04T09:00:00Z"), now), "3h ago");
  assert.equal(relativeTime(new Date("2026-07-02T12:00:00Z"), now), "2d ago");
  assert.equal(relativeTime(null, now), "unknown");
});

test("humanDuration formats mm:ss and Hh MMm", () => {
  assert.equal(humanDuration(0), "-");
  assert.equal(humanDuration(65), "1:05");
  assert.equal(humanDuration(600), "10:00");
  assert.equal(humanDuration(3720), "1h 02m");
});

test("humanBytes scales units", () => {
  assert.equal(humanBytes(0), "0 MB");
  assert.equal(humanBytes(500 * 1024), "500 KB");
  assert.equal(humanBytes(5 * 1024 * 1024), "5.0 MB");
  assert.equal(humanBytes(2 * 1024 * 1024 * 1024), "2.00 GB");
});

test("humanTotalTime rounds to minutes then hours", () => {
  assert.equal(humanTotalTime(120), "2m");
  assert.equal(humanTotalTime(3720), "1h 02m");
});
