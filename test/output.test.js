import test from "node:test";
import assert from "node:assert/strict";
import { formatCheckResults } from "../src/core/output.js";

test("formatCheckResults renders self-updating tools without fake latest unknown", () => {
  const output = formatCheckResults([
    {
      id: "cursor",
      name: "Cursor CLI",
      installed: true,
      currentVersion: "2026.5.16-0338208",
      latestVersion: null,
      installSource: "self-update",
      status: "unknown",
      updateAvailable: false,
      message: "Cursor CLI is installed. Latest version is managed by its self-update command.",
      errors: []
    }
  ]);

  assert.match(output, /Cursor CLI\s+2026\.5\.16-0338208\s+self-update managed/);
  assert.doesNotMatch(output, /-> unknown\s+unknown/);
});
