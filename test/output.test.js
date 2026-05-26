import test from "node:test";
import assert from "node:assert/strict";
import { formatCheckResults, formatUpdatePlan, formatUpdateVerification } from "../src/core/output.js";

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

test("formatUpdatePlan labels non-executable plans as manual commands", () => {
  const output = formatUpdatePlan({
    name: "Codex CLI",
    currentVersion: "0.132.0",
    targetVersion: "0.133.0",
    strategy: "manual",
    commands: [["npm", "install", "-g", "@openai/codex@latest"]],
    canExecute: false,
    riskNotes: [
      "Automatic update is disabled because the install source could not be verified."
    ]
  }, false);

  assert.match(output, /Manual command:/);
  assert.match(output, /npm install -g @openai\/codex@latest/);
  assert.doesNotMatch(output, /Commands:/);
});

test("formatUpdatePlan labels fallback plans as executable commands", () => {
  const output = formatUpdatePlan({
    name: "Codex CLI",
    currentVersion: "0.132.0",
    targetVersion: "0.133.0",
    strategy: "fallback",
    commands: [["npm", "install", "-g", "@openai/codex@latest"]],
    canExecute: true,
    riskNotes: [
      "Install source could not be verified; this runs the configured fallback update command."
    ]
  }, false);

  assert.match(output, /Commands:/);
  assert.match(output, /npm install -g @openai\/codex@latest/);
  assert.doesNotMatch(output, /Manual command:/);
});

test("formatUpdateVerification warns when active executable remains outdated", () => {
  const output = formatUpdateVerification({
    targetVersion: "0.133.0"
  }, {
    name: "Codex CLI",
    currentVersion: "0.132.0",
    status: "update_available",
    errors: [
      {
        source: "multiple_installations",
        message: "Multiple codex installations on PATH have different versions. Others: /opt/homebrew/bin/codex (0.133.0)."
      }
    ]
  });

  assert.match(output, /Post-update check/);
  assert.match(output, /active executable still appears outdated/);
  assert.match(output, /Check PATH order/);
  assert.match(output, /multiple_installations/);
});

test("formatUpdateVerification confirms up-to-date active executable", () => {
  const output = formatUpdateVerification({
    targetVersion: "0.133.0"
  }, {
    name: "Codex CLI",
    currentVersion: "0.133.0",
    status: "up_to_date",
    errors: []
  });

  assert.match(output, /active executable is up to date/);
});

test("formatUpdateVerification warns about multiple installations even when status is up to date", () => {
  const output = formatUpdateVerification({
    targetVersion: "0.133.0"
  }, {
    name: "Codex CLI",
    currentVersion: "0.133.0",
    status: "up_to_date",
    errors: [
      {
        source: "multiple_installations",
        message: "Multiple codex installations on PATH have different versions."
      }
    ]
  });

  assert.match(output, /multiple installations remain on PATH/);
  assert.match(output, /active executable is up to date/);
});
