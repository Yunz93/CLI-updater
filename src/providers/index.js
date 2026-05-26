import { resolveAllExecutables, resolveExecutable, runCommand } from "../core/exec.js";
import { getNpmLatestVersion } from "../core/npmRegistry.js";
import { getPyPiLatestVersion } from "../core/pypiRegistry.js";
import { createNpmCliProvider, createPyPiCliProvider, createSelfUpdatingCliProvider } from "./factory.js";

const dependencies = {
  resolveExecutable,
  resolveAllExecutables,
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
    updateCommand: ["npm", "install", "-g", "@openai/codex@latest"],
    selfUpdateCommand: ["codex", "update"],
    allowFallbackUpdate: true,
    warnMultipleExecutables: true,
    riskNotes: [
      "Codex may require restarting the active shell if another installation shadows the npm binary."
    ]
  }, dependencies),
  createNpmCliProvider({
    id: "claude",
    aliases: ["claude", "claude-code"],
    displayName: "Claude Code",
    executable: "claude",
    packageName: "@anthropic-ai/claude-code",
    versionArgsList: [["--version"], ["-v"]],
    updateCommand: ["npm", "install", "-g", "@anthropic-ai/claude-code@latest"],
    selfUpdateCommand: ["claude", "update"],
    riskNotes: [
      "Claude Code updates are executed through npm for verified npm-global installs."
    ]
  }, dependencies),
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
    manualUpdateCommand: ["sh", "-c", "curl -LsSf https://code.kimi.com/install.sh | bash"],
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
    updateCommand: ["npm", "install", "-g", "@qwen-code/qwen-code@latest"],
    manualUpdateCommand: ["sh", "-c", "curl -fsSL https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen.sh | bash"]
  }, dependencies),
  createNpmCliProvider({
    id: "opencode",
    aliases: ["opencode", "open-code"],
    displayName: "OpenCode",
    executable: "opencode",
    packageName: "opencode-ai",
    versionArgsList: [["--version"], ["version"], ["-v"]],
    updateCommand: ["npm", "install", "-g", "opencode-ai@latest"],
    manualUpdateCommand: ["sh", "-c", "curl -fsSL https://opencode.ai/install | bash"]
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
    manualUpdateCommand: ["sh", "-c", "curl -fsSL https://gh.io/copilot-install | bash"],
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
    manualUpdateCommand: ["sh", "-c", "curl -LsSf https://aider.chat/install.sh | sh"]
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
