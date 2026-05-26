import test from "node:test";
import assert from "node:assert/strict";
import { findProvider, providers } from "../src/providers/index.js";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("real provider update commands match their managed install sources", () => {
  assert.deepEqual(providers.map((provider) => provider.id), [
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

  const expectedCommands = {
    codex: ["npm", "install", "-g", "@openai/codex@latest"],
    claude: ["npm", "install", "-g", "@anthropic-ai/claude-code@latest"],
    gemini: ["npm", "install", "-g", "@google/gemini-cli@latest"],
    cursor: ["cursor-agent", "update"],
    kimi: ["uv", "tool", "upgrade", "kimi-cli"],
    qwen: ["npm", "install", "-g", "@qwen-code/qwen-code@latest"],
    opencode: ["npm", "install", "-g", "opencode-ai@latest"],
    amp: ["npm", "install", "-g", "@ampcode/cli@latest"],
    copilot: ["npm", "install", "-g", "@github/copilot@latest"],
    aider: ["pipx", "upgrade", "aider-chat"]
  };

  for (const [id, command] of Object.entries(expectedCommands)) {
    assert.deepEqual(findProvider(id).updateCommand, command);
  }
});

test("real providers expose official installer guidance when automatic update is disabled", () => {
  const manualNeedles = {
    kimi: "https://code.kimi.com/install.sh",
    qwen: "https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen.sh",
    opencode: "https://opencode.ai/install",
    amp: "https://ampcode.com/install.sh",
    copilot: "https://gh.io/copilot-install",
    aider: "https://aider.chat/install.sh"
  };

  for (const [id, needle] of Object.entries(manualNeedles)) {
    const plan = findProvider(id).getUpdatePlan({
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      installSource: "unknown"
    });
    assert.equal(plan.canExecute, false);
    assert.match(plan.manualInstructions, new RegExp(escapeRegExp(needle)));
  }
});
