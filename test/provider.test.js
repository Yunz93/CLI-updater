import test from "node:test";
import assert from "node:assert/strict";
import { createNpmCliProvider, createPyPiCliProvider, createSelfUpdatingCliProvider } from "../src/providers/factory.js";

function makeProvider(overrides = {}) {
  return createNpmCliProvider({
    id: "sample",
    aliases: ["sample-cli"],
    displayName: "Sample CLI",
    executable: "sample",
    packageName: "@example/sample",
    versionArgsList: [["--version"]],
    updateCommand: ["npm", "install", "-g", "@example/sample@latest"]
  }, {
    resolveExecutable: overrides.resolveExecutable ?? (async () => "/usr/local/bin/sample"),
    runCommand: overrides.runCommand ?? (async () => ({
      ok: true,
      code: 0,
      stdout: "sample 1.2.3",
      stderr: "",
      error: null
    })),
    getNpmLatestVersion: overrides.getNpmLatestVersion ?? (async () => ({
      ok: true,
      version: "1.3.0",
      error: null
    }))
  });
}

function makePyPiProvider(overrides = {}) {
  return createPyPiCliProvider({
    id: "sample-py",
    aliases: ["sample-py-cli"],
    displayName: "Sample Python CLI",
    executable: "sample-py",
    packageName: "sample-python-cli",
    versionArgsList: [["--version"]],
    updateCommand: ["pipx", "upgrade", "sample-python-cli"],
    updateCommandsBySource: {
      "pipx": ["pipx", "upgrade", "sample-python-cli"],
      "uv-tool": ["uv", "tool", "upgrade", "sample-python-cli"]
    }
  }, {
    resolveExecutable: overrides.resolveExecutable ?? (async () => "/Users/example/.local/bin/sample-py"),
    runCommand: overrides.runCommand ?? (async () => ({
      ok: true,
      code: 0,
      stdout: "sample-py 2.0.0",
      stderr: "",
      error: null
    })),
    getPyPiLatestVersion: overrides.getPyPiLatestVersion ?? (async () => ({
      ok: true,
      version: "2.1.0",
      error: null
    }))
  });
}

function makeSelfUpdatingProvider(overrides = {}) {
  return createSelfUpdatingCliProvider({
    id: "self",
    aliases: ["self-agent"],
    displayName: "Self Updating CLI",
    executable: "self-agent",
    versionArgsList: [["--version"]],
    updateCommand: ["self-agent", "update"],
    manualUpdateCommand: ["sh", "-c", "curl https://example.com/install -fsS | bash"]
  }, {
    resolveExecutable: overrides.resolveExecutable ?? (async () => "/Users/example/.local/bin/self-agent"),
    runCommand: overrides.runCommand ?? (async () => ({
      ok: true,
      code: 0,
      stdout: "self-agent 3.0.0",
      stderr: "",
      error: null
    }))
  });
}

test("provider returns not_installed when executable is missing", async () => {
  const provider = makeProvider({
    resolveExecutable: async () => null
  });

  const result = await provider.check();

  assert.equal(result.installed, false);
  assert.equal(result.status, "not_installed");
  assert.equal(result.updateAvailable, false);
});

test("provider reports update_available when latest version is newer", async () => {
  const provider = makeProvider({
    runCommand: async (command) => {
      if (command === "npm") {
        return {
          ok: true,
          code: 0,
          stdout: JSON.stringify({ dependencies: { "@example/sample": { version: "1.2.3" } } }),
          stderr: "",
          error: null
        };
      }

      return {
        ok: true,
        code: 0,
        stdout: "sample 1.2.3",
        stderr: "",
        error: null
      };
    }
  });

  const result = await provider.check();

  assert.equal(result.installed, true);
  assert.equal(result.currentVersion, "1.2.3");
  assert.equal(result.latestVersion, "1.3.0");
  assert.equal(result.installSource, "npm-global");
  assert.equal(result.status, "update_available");
  assert.equal(result.updateAvailable, true);
});

test("provider preserves latest version lookup errors without failing the whole check", async () => {
  const provider = makeProvider({
    getNpmLatestVersion: async () => ({
      ok: false,
      version: null,
      error: "network unavailable"
    })
  });

  const result = await provider.check();

  assert.equal(result.status, "unknown");
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].source, "latest_version");
});

test("provider falls back to npm global package version when CLI version command fails", async () => {
  const provider = makeProvider({
    runCommand: async (command) => {
      if (command === "npm") {
        return {
          ok: true,
          code: 0,
          stdout: JSON.stringify({ dependencies: { "@example/sample": { version: "1.2.3" } } }),
          stderr: "",
          error: null
        };
      }

      return {
        ok: false,
        code: null,
        stdout: "",
        stderr: "",
        error: "Command timed out after 5000ms"
      };
    }
  });

  const result = await provider.check();

  assert.equal(result.currentVersion, "1.2.3");
  assert.equal(result.installSource, "npm-global");
  assert.equal(result.errors.some((error) => error.source === "current_version"), false);
});


test("provider exposes an update plan without executing it", () => {
  const provider = makeProvider();

  const plan = provider.getUpdatePlan({
    currentVersion: "1.2.3",
    latestVersion: "1.3.0",
    installSource: "npm-global"
  });

  assert.deepEqual(plan.commands, [["npm", "install", "-g", "@example/sample@latest"]]);
  assert.equal(plan.canExecute, true);
  assert.equal(plan.requiresConfirmation, true);
});

test("provider enables self-update when native installer exposes update command", async () => {
  const provider = createNpmCliProvider({
    id: "claude",
    aliases: ["claude"],
    displayName: "Claude Code",
    executable: "claude",
    packageName: "@anthropic-ai/claude-code",
    versionArgsList: [["--version"]],
    updateCommand: ["npm", "install", "-g", "@anthropic-ai/claude-code@latest"],
    selfUpdateCommand: ["claude", "update"]
  }, {
    resolveExecutable: async () => "/Users/example/.local/bin/claude",
    getNpmLatestVersion: async () => ({
      ok: true,
      version: "2.1.145",
      error: null
    }),
    runCommand: async (command, args) => {
      if (command === "npm") {
        return {
          ok: true,
          code: 0,
          stdout: JSON.stringify({ name: "lib" }),
          stderr: "",
          error: null
        };
      }

      if (command === "/Users/example/.local/bin/claude" && args[0] === "--version") {
        return {
          ok: true,
          code: 0,
          stdout: "2.1.144 (Claude Code)",
          stderr: "",
          error: null
        };
      }

      if (command === "/Users/example/.local/bin/claude" && args[0] === "update") {
        return {
          ok: true,
          code: 0,
          stdout: "Usage: claude update|upgrade [options]",
          stderr: "",
          error: null
        };
      }

      return {
        ok: false,
        code: 1,
        stdout: "",
        stderr: "",
        error: "unexpected command"
      };
    }
  });

  const result = await provider.check();
  assert.equal(result.installSource, "self-update");
  assert.equal(result.status, "update_available");

  const plan = provider.getUpdatePlan(result);
  assert.equal(plan.strategy, "self-update");
  assert.equal(plan.canExecute, true);
  assert.deepEqual(plan.commands, [["claude", "update"]]);
});

test("provider disables automatic update for unknown install source", () => {
  const provider = makeProvider();

  const plan = provider.getUpdatePlan({
    currentVersion: "1.2.3",
    latestVersion: "1.3.0",
    installSource: "unknown"
  });

  assert.equal(plan.strategy, "manual");
  assert.equal(plan.canExecute, false);
  assert.equal(plan.requiresConfirmation, false);
});

test("PyPI provider reports pipx install source when pipx owns the package", async () => {
  const provider = makePyPiProvider({
    runCommand: async (command) => {
      if (command === "pipx") {
        return {
          ok: true,
          code: 0,
          stdout: JSON.stringify({ venvs: { "sample-python-cli": {} } }),
          stderr: "",
          error: null
        };
      }

      return {
        ok: true,
        code: 0,
        stdout: "sample-py 2.0.0",
        stderr: "",
        error: null
      };
    }
  });

  const result = await provider.check();
  const plan = provider.getUpdatePlan(result);

  assert.equal(result.installSource, "pipx");
  assert.equal(result.status, "update_available");
  assert.equal(plan.strategy, "pipx");
  assert.equal(plan.canExecute, true);
});

test("PyPI provider reports uv-tool install source when uv owns the package", async () => {
  const provider = makePyPiProvider({
    runCommand: async (command) => {
      if (command === "pipx") {
        return {
          ok: true,
          code: 0,
          stdout: JSON.stringify({ venvs: {} }),
          stderr: "",
          error: null
        };
      }

      if (command === "uv") {
        return {
          ok: true,
          code: 0,
          stdout: "sample-python-cli v2.0.0\n- sample-py (/Users/example/.local/bin/sample-py)",
          stderr: "",
          error: null
        };
      }

      return {
        ok: true,
        code: 0,
        stdout: "sample-py 2.0.0",
        stderr: "",
        error: null
      };
    }
  });

  const result = await provider.check();
  const plan = provider.getUpdatePlan(result);

  assert.equal(result.installSource, "uv-tool");
  assert.equal(plan.strategy, "uv-tool");
  assert.deepEqual(plan.commands, [["uv", "tool", "upgrade", "sample-python-cli"]]);
  assert.equal(plan.canExecute, true);
});

test("PyPI provider falls back to uv tool package version when CLI version command fails", async () => {
  const provider = makePyPiProvider({
    runCommand: async (command) => {
      if (command === "pipx") {
        return {
          ok: true,
          code: 0,
          stdout: JSON.stringify({ venvs: {} }),
          stderr: "",
          error: null
        };
      }

      if (command === "uv") {
        return {
          ok: true,
          code: 0,
          stdout: "sample-python-cli v2.0.0",
          stderr: "",
          error: null
        };
      }

      return {
        ok: false,
        code: null,
        stdout: "",
        stderr: "",
        error: "Command timed out after 5000ms"
      };
    }
  });

  const result = await provider.check();

  assert.equal(result.currentVersion, "2.0.0");
  assert.equal(result.installSource, "uv-tool");
  assert.equal(result.errors.some((error) => error.source === "current_version"), false);
});

test("PyPI provider disables automatic updates for non-pipx installs", () => {
  const provider = makePyPiProvider();

  const plan = provider.getUpdatePlan({
    currentVersion: "2.0.0",
    latestVersion: "2.1.0",
    installSource: "unknown"
  });

  assert.equal(plan.strategy, "manual");
  assert.equal(plan.canExecute, false);
});

test("self-updating provider reads local version and exposes update command", async () => {
  const provider = makeSelfUpdatingProvider();

  const result = await provider.check();
  const plan = provider.getUpdatePlan(result);

  assert.equal(result.currentVersion, "3.0.0");
  assert.equal(result.latestVersion, null);
  assert.equal(result.status, "unknown");
  assert.equal(result.installSource, "self-update");
  assert.equal(plan.strategy, "self-update");
  assert.deepEqual(plan.commands, [["self-agent", "update"]]);
  assert.equal(plan.canExecute, true);
});

test("self-updating provider points to installer when executable is missing", async () => {
  const provider = makeSelfUpdatingProvider({
    resolveExecutable: async () => null
  });

  const result = await provider.check();
  const plan = provider.getUpdatePlan(result);

  assert.equal(result.status, "not_installed");
  assert.equal(plan.canExecute, false);
  assert.match(plan.manualInstructions, /curl https:\/\/example\.com\/install/);
});
