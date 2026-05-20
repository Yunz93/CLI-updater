import test from "node:test";
import assert from "node:assert/strict";
import { compareVersions, parseVersion, statusFromVersions } from "../src/core/semver.js";

test("parseVersion extracts semantic versions from common CLI output", () => {
  assert.equal(parseVersion("codex 1.2.3").normalized, "1.2.3");
  assert.equal(parseVersion("v2.0.1").normalized, "2.0.1");
  assert.equal(parseVersion("Claude Code 3.4.5-beta.1").normalized, "3.4.5-beta.1");
  assert.equal(parseVersion("no version here"), null);
});

test("compareVersions compares major, minor, patch, and prerelease values", () => {
  assert.equal(compareVersions("1.2.3", "1.2.4"), -1);
  assert.equal(compareVersions("1.3.0", "1.2.9"), 1);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("1.0.0-beta.1", "1.0.0"), -1);
});

test("statusFromVersions maps comparison results to product statuses", () => {
  assert.equal(statusFromVersions("1.2.3", "1.2.4"), "update_available");
  assert.equal(statusFromVersions("1.2.4", "1.2.4"), "up_to_date");
  assert.equal(statusFromVersions("1.2.5", "1.2.4"), "local_newer");
  assert.equal(statusFromVersions(null, "1.2.4"), "unknown");
});
