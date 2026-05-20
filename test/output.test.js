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

test("formatCheckResults shows update_available for self-update tools with registry latest", () => {
  const output = formatCheckResults([
    {
      id: "codex",
      name: "Codex CLI",
      installed: true,
      currentVersion: "0.131.0-alpha.9",
      latestVersion: "0.132.0",
      installSource: "self-update",
      status: "update_available",
      updateAvailable: true,
      message: "Codex CLI can be updated from 0.131.0-alpha.9 to 0.132.0.",
      errors: []
    }
  ]);

  assert.match(output, /Codex CLI\s+0\.131\.0-alpha\.9 -> 0\.132\.0\s+update available/);
});
