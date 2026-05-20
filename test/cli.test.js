import test from "node:test";
import assert from "node:assert/strict";
import { filterCheckResults, main } from "../src/cli.js";

function createIo() {
  let stdout = "";
  let stderr = "";
  return {
    stdout: {
      write(value) {
        stdout += value;
      }
    },
    stderr: {
      write(value) {
        stderr += value;
      }
    },
    get stdoutText() {
      return stdout;
    },
    get stderrText() {
      return stderr;
    }
  };
}

test("list --json returns supported provider metadata", async () => {
  const io = createIo();

  const code = await main(["list", "--json"], io);
  const payload = JSON.parse(io.stdoutText);

  assert.equal(code, 0);
  assert.deepEqual(payload.tools.map((tool) => tool.id), [
    "codex",
    "claude",
    "gemini",
    "cursor",
    "kimi",
    "qwen",
    "opencode",
    "amp",
    "copilot",
    "aider"
  ]);
  assert.equal(payload.tools.find((tool) => tool.id === "aider").registry, "pypi");
});

test("unknown command returns argument error", async () => {
  const io = createIo();

  const code = await main(["missing"], io);

  assert.equal(code, 3);
  assert.match(io.stderrText, /Unknown command/);
});

test("unknown tool returns supported tool list", async () => {
  const io = createIo();

  const code = await main(["check", "unknown-tool", "--json"], io);
  const payload = JSON.parse(io.stdoutText);

  assert.equal(code, 3);
  assert.equal(payload.error, "unknown_tool");
  assert.deepEqual(payload.supportedTools, [
    "codex",
    "claude",
    "gemini",
    "cursor",
    "kimi",
    "qwen",
    "opencode",
    "amp",
    "copilot",
    "aider"
  ]);
});

test("filterCheckResults hides not installed tools by default", () => {
  const results = [
    { id: "codex", installed: true },
    { id: "qwen", installed: false }
  ];

  assert.deepEqual(filterCheckResults(results, {
    tool: undefined,
    flags: { includeNotInstalled: false }
  }), [
    { id: "codex", installed: true }
  ]);
});

test("filterCheckResults keeps not installed tools when requested or targeted", () => {
  const results = [
    { id: "qwen", installed: false }
  ];

  assert.deepEqual(filterCheckResults(results, {
    tool: undefined,
    flags: { includeNotInstalled: true }
  }), results);

  assert.deepEqual(filterCheckResults(results, {
    tool: "qwen",
    flags: { includeNotInstalled: false }
  }), results);
});
