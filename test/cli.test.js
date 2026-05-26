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

test("update --yes executes plan command and performs post-update verification", async () => {
  const io = createIo();
  const checkResults = [
    {
      id: "sample",
      name: "Sample CLI",
      installed: true,
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      status: "update_available",
      errors: []
    },
    {
      id: "sample",
      name: "Sample CLI",
      installed: true,
      currentVersion: "1.1.0",
      latestVersion: "1.1.0",
      status: "up_to_date",
      errors: []
    }
  ];
  let checkIndex = 0;
  const calls = [];
  const provider = {
    displayName: "Sample CLI",
    check: async () => checkResults[checkIndex++],
    getUpdatePlan: (checkResult) => ({
      id: "sample",
      name: "Sample CLI",
      currentVersion: checkResult.currentVersion,
      targetVersion: checkResult.latestVersion,
      strategy: "npm-global",
      commands: [["npm", "install", "-g", "@example/sample@latest"]],
      canExecute: true,
      requiresConfirmation: true,
      riskNotes: []
    })
  };

  const code = await main(["update", "sample", "--yes"], io, {
    confirm: async () => {
      throw new Error("confirm should not be called with --yes");
    },
    findProvider: () => provider,
    providers: [],
    runCommand: async (bin, args) => {
      calls.push([bin, ...args]);
      return {
        ok: true,
        code: 0,
        stdout: "",
        stderr: "",
        error: null
      };
    }
  });

  assert.equal(code, 0);
  assert.deepEqual(calls, [["npm", "install", "-g", "@example/sample@latest"]]);
  assert.match(io.stdoutText, /Post-update check/);
  assert.match(io.stdoutText, /active executable is up to date/);
  assert.equal(checkIndex, 2);
});

test("update --json writes one parseable payload with verification", async () => {
  const io = createIo();
  const checkResults = [
    {
      id: "sample",
      name: "Sample CLI",
      installed: true,
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      status: "update_available",
      errors: []
    },
    {
      id: "sample",
      name: "Sample CLI",
      installed: true,
      currentVersion: "1.1.0",
      latestVersion: "1.1.0",
      status: "up_to_date",
      updateAvailable: false,
      errors: []
    }
  ];
  let checkIndex = 0;
  const provider = {
    displayName: "Sample CLI",
    check: async () => checkResults[checkIndex++],
    getUpdatePlan: (checkResult) => ({
      id: "sample",
      name: "Sample CLI",
      currentVersion: checkResult.currentVersion,
      targetVersion: checkResult.latestVersion,
      strategy: "npm-global",
      commands: [["npm", "install", "-g", "@example/sample@latest"]],
      canExecute: true,
      requiresConfirmation: true,
      riskNotes: []
    })
  };

  const code = await main(["update", "sample", "--yes", "--json"], io, {
    confirm: async () => true,
    findProvider: () => provider,
    providers: [],
    runCommand: async () => ({
      ok: true,
      code: 0,
      stdout: "",
      stderr: "",
      error: null
    })
  });

  const payload = JSON.parse(io.stdoutText);

  assert.equal(code, 0);
  assert.equal(payload.dryRun, false);
  assert.equal(payload.tool.currentVersion, "1.0.0");
  assert.equal(payload.verification.status, "up_to_date");
});

test("update returns exit code 2 when verification still shows update_available", async () => {
  const io = createIo();
  const checkResults = [
    {
      id: "sample",
      name: "Sample CLI",
      installed: true,
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      status: "update_available",
      updateAvailable: true,
      errors: []
    },
    {
      id: "sample",
      name: "Sample CLI",
      installed: true,
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      status: "update_available",
      updateAvailable: true,
      errors: []
    }
  ];
  let checkIndex = 0;
  const provider = {
    displayName: "Sample CLI",
    check: async () => checkResults[checkIndex++],
    getUpdatePlan: (checkResult) => ({
      id: "sample",
      name: "Sample CLI",
      currentVersion: checkResult.currentVersion,
      targetVersion: checkResult.latestVersion,
      strategy: "npm-global",
      commands: [["npm", "install", "-g", "@example/sample@latest"]],
      canExecute: true,
      requiresConfirmation: true,
      riskNotes: []
    })
  };

  const code = await main(["update", "sample", "--yes"], io, {
    confirm: async () => true,
    findProvider: () => provider,
    providers: [],
    runCommand: async () => ({
      ok: true,
      code: 0,
      stdout: "",
      stderr: "",
      error: null
    })
  });

  assert.equal(code, 2);
  assert.match(io.stdoutText, /active executable still appears outdated/);
});
