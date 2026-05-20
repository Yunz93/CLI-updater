import { resolveExecutable, runCommand } from "../core/exec.js";
import { getNpmLatestVersion } from "../core/npmRegistry.js";
import { getPyPiLatestVersion } from "../core/pypiRegistry.js";
import { createNpmCliProvider, createPyPiCliProvider, createSelfUpdatingCliProvider } from "./factory.js";

const dependencies = {
  resolveExecutable,
  runCommand,
  getNpmLatestVersion,
  getPyPiLatestVersion
};

export const providers = [
  createNpmCliProvider({
    id: "codex",
    aliases: ["codex", "codex-cli"],
    displayName: "Codex CLI",
    executable: "codex",
    packageName: "@openai/codex",
    versionArgsList: [["--version"], ["-V"]],
    updateCommand: ["npm", "install", "-g", "@openai/codex@latest"]
  }, dependencies),
  createNpmCliProvider({
    id: "claude",
    aliases: ["claude", "claude-code"],
    displayName: "Claude Code",
    executable: "claude",
    packageName: "@anthropic-ai/claude-code",
    versionArgsList: [["--version"], ["-v"]],
    updateCommand: ["npm", "install", "-g", "@anthropic-ai/claude-code@latest"]
  }, dependencies)
  ,
  createNpmCliProvider({
    id: "gemini",
    aliases: ["gemini", "gemini-cli"],
    displayName: "Gemini CLI",
    executable: "gemini",
    packageName: "@google/gemini-cli",
    versionArgsList: [["--version"], ["-v"]],
    updateCommand: ["npm", "install", "-g", "@google/gemini-cli@latest"]
  }, dependencies),
  createSelfUpdatingCliProvider({
    id: "cursor",
    aliases: ["cursor", "cursor-agent", "cursor-cli"],
    displayName: "Cursor CLI",
    executable: "cursor-agent",
    versionArgsList: [["--version"], ["version"], ["-v"]],
    updateCommand: ["cursor-agent", "update"],
    manualUpdateCommand: ["sh", "-c", "curl https://cursor.com/install -fsS | bash"]
  }, dependencies),
  createPyPiCliProvider({
    id: "kimi",
    aliases: ["kimi", "kimi-cli", "kimi-code"],
    displayName: "Kimi CLI",
    executable: "kimi",
    packageName: "kimi-cli",
    versionArgsList: [["--version"], ["-v"]],
    updateCommand: ["uv", "tool", "upgrade", "kimi-cli"],
    updateCommandsBySource: {
      "pipx": ["pipx", "upgrade", "kimi-cli"],
      "uv-tool": ["uv", "tool", "upgrade", "kimi-cli"]
    },
    updateTimeoutMs: 900_000,
    manualUpdateCommand: ["uv", "tool", "install", "--python", "3.13", "kimi-cli"],
    riskNotes: [
      "Kimi CLI is currently documented as a technical preview for macOS and Linux."
    ]
  }, dependencies),
  createNpmCliProvider({
    id: "qwen",
    aliases: ["qwen", "qwen-code"],
    displayName: "Qwen Code",
    executable: "qwen",
    packageName: "@qwen-code/qwen-code",
    versionArgsList: [["--version"], ["-v"]],
    updateCommand: ["npm", "install", "-g", "@qwen-code/qwen-code@latest"]
  }, dependencies),
  createNpmCliProvider({
    id: "opencode",
    aliases: ["opencode", "open-code"],
    displayName: "OpenCode",
    executable: "opencode",
    packageName: "opencode-ai",
    versionArgsList: [["--version"], ["version"], ["-v"]],
    updateCommand: ["npm", "install", "-g", "opencode-ai@latest"]
  }, dependencies),
  createNpmCliProvider({
    id: "amp",
    aliases: ["amp", "ampcode"],
    displayName: "Amp",
    executable: "amp",
    packageName: "@ampcode/cli",
    versionArgsList: [["--version"], ["version"], ["-v"]],
    updateCommand: ["npm", "install", "-g", "@ampcode/cli@latest"],
    manualUpdateCommand: ["sh", "-c", "curl -fsSL https://ampcode.com/install.sh | bash"],
    riskNotes: [
      "Amp currently recommends its direct installer; npm is supported for npm-managed installs."
    ]
  }, dependencies),
  createNpmCliProvider({
    id: "copilot",
    aliases: ["copilot", "github-copilot"],
    displayName: "GitHub Copilot CLI",
    executable: "copilot",
    packageName: "@github/copilot",
    versionArgsList: [["--version"], ["version"], ["-v"]],
    updateCommand: ["npm", "install", "-g", "@github/copilot@latest"],
    riskNotes: [
      "GitHub Copilot CLI requires Node.js 22 or later when installed through npm."
    ]
  }, dependencies),
  createPyPiCliProvider({
    id: "aider",
    aliases: ["aider", "aider-chat"],
    displayName: "Aider",
    executable: "aider",
    packageName: "aider-chat",
    versionArgsList: [["--version"], ["-v"]],
    updateCommand: ["pipx", "upgrade", "aider-chat"],
    updateCommandsBySource: {
      "pipx": ["pipx", "upgrade", "aider-chat"],
      "uv-tool": ["uv", "tool", "upgrade", "aider-chat"]
    },
    manualUpdateCommand: ["pipx", "upgrade", "aider-chat"]
  }, dependencies)
];

export function findProvider(tool) {
  if (!tool) {
    return null;
  }

  return providers.find((provider) => {
    return provider.id === tool || provider.aliases.includes(tool);
  }) ?? null;
}
