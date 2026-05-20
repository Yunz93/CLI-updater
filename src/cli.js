#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runCommand } from "./core/exec.js";
import { formatCheckResults, formatJson, formatProviderList, formatUpdatePlan } from "./core/output.js";
import { confirm } from "./core/prompts.js";
import { findProvider, providers } from "./providers/index.js";

function getHelp() {
  const toolLines = providers.map((provider) => {
    return `  ${provider.id.padEnd(12)} ${provider.displayName}`;
  }).join("\n");

  return `CLI Updater

Usage:
  agent-cli-updater check [tool] [--json] [--include-not-installed]
  agent-cli-updater update <tool> [--dry-run] [--yes]
  agent-cli-updater list [--json]
  agent-cli-updater doctor [--json]

Tools:
${toolLines}

Options:
  --json      Output machine-readable JSON
  --include-not-installed
              Show supported tools that are not installed during check
  --dry-run   Show update plan without running commands
  --yes       Skip confirmation for update command
  --help      Show help
`;
}

export async function main(argv = process.argv.slice(2), io = process) {
  const parsed = parseArgs(argv);

  if (parsed.flags.help || !parsed.command) {
    io.stdout.write(getHelp());
    return 0;
  }

  if (parsed.command === "check") {
    return runCheck(parsed, io);
  }

  if (parsed.command === "list") {
    return runList(parsed, io);
  }

  if (parsed.command === "doctor") {
    return runDoctor(parsed, io);
  }

  if (parsed.command === "update") {
    return runUpdate(parsed, io);
  }

  io.stderr.write(`Unknown command: ${parsed.command}\n\n${getHelp()}`);
  return 3;
}

function parseArgs(argv) {
  const flags = {
    json: false,
    dryRun: false,
    yes: false,
    help: false,
    includeNotInstalled: false
  };
  const positional = [];

  for (const arg of argv) {
    if (arg === "--json") flags.json = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--yes" || arg === "-y") flags.yes = true;
    else if (arg === "--include-not-installed") flags.includeNotInstalled = true;
    else if (arg === "--help" || arg === "-h") flags.help = true;
    else positional.push(arg);
  }

  return {
    command: positional[0],
    tool: positional[1],
    flags
  };
}

async function runCheck(parsed, io) {
  const selected = selectProviders(parsed.tool);
  if (!selected.ok) {
    return writeUnknownTool(parsed.tool, parsed.flags.json, io);
  }

  const results = await Promise.all(selected.providers.map((provider) => provider.check()));
  const visibleResults = filterCheckResults(results, parsed);
  if (parsed.flags.json) {
    io.stdout.write(formatJson({ tools: visibleResults }));
  } else {
    io.stdout.write(formatCheckResults(visibleResults));
  }

  return results.some((result) => result.updateAvailable) ? 2 : 0;
}

export function filterCheckResults(results, parsed) {
  if (parsed.tool || parsed.flags.includeNotInstalled) {
    return results;
  }

  return results.filter((result) => result.installed);
}

function runList(parsed, io) {
  if (parsed.flags.json) {
    io.stdout.write(formatJson({
      tools: providers.map((provider) => ({
        id: provider.id,
        name: provider.displayName,
        executable: provider.executable,
        registry: provider.registry,
        packageName: provider.packageName,
        aliases: provider.aliases
      }))
    }));
  } else {
    io.stdout.write(formatProviderList(providers));
  }

  return 0;
}

async function runDoctor(parsed, io) {
  const checks = [
    {
      name: "node",
      ok: Number(process.versions.node.split(".")[0]) >= 18,
      detail: process.version
    },
    {
      name: "fetch",
      ok: typeof fetch === "function",
      detail: typeof fetch === "function" ? "available" : "unavailable"
    }
  ];

  if (parsed.flags.json) {
    io.stdout.write(formatJson({ checks }));
  } else {
    io.stdout.write(`CLI Updater Doctor\n\n${checks.map((check) => {
      return `${check.name.padEnd(10)} ${check.ok ? "ok" : "error"}    ${check.detail}`;
    }).join("\n")}\n`);
  }

  return checks.every((check) => check.ok) ? 0 : 1;
}

async function runUpdate(parsed, io) {
  if (!parsed.tool) {
    io.stderr.write("Missing tool. Usage: agent-cli-updater update <tool> [--dry-run] [--yes]\n");
    return 3;
  }

  const provider = findProvider(parsed.tool);
  if (!provider) {
    return writeUnknownTool(parsed.tool, parsed.flags.json, io);
  }

  const checkResult = await provider.check();
  const plan = provider.getUpdatePlan(checkResult);

  if (parsed.flags.json) {
    io.stdout.write(formatJson({ tool: checkResult, plan, dryRun: parsed.flags.dryRun }));
  } else {
    io.stdout.write(formatUpdatePlan(plan, parsed.flags.dryRun));
  }

  if (parsed.flags.dryRun) {
    return 0;
  }

  if (!checkResult.installed) {
    io.stderr.write(`${provider.displayName} is not installed. Update cannot run.\n`);
    return 1;
  }

  if (!plan.canExecute) {
    io.stderr.write(`${provider.displayName} install source is unknown. Automatic update is disabled.\n`);
    io.stderr.write(`${plan.manualInstructions}\n`);
    return 1;
  }

  if (!parsed.flags.yes) {
    const accepted = await confirm("Run this update command?");
    if (!accepted) {
      io.stderr.write("Update cancelled.\n");
      return 1;
    }
  }

  for (const command of plan.commands) {
    const [bin, ...args] = command;
    const result = await runCommand(bin, args, {
      timeoutMs: plan.timeoutMs ?? 600_000,
      heartbeatMs: parsed.flags.json ? null : 30_000,
      heartbeatLabel: command.join(" "),
      onStdout: parsed.flags.json ? null : (text) => io.stdout.write(text),
      onStderr: parsed.flags.json ? null : (text) => io.stderr.write(text)
    });
    if (parsed.flags.json && result.stdout) io.stdout.write(result.stdout);
    if (parsed.flags.json && result.stderr) io.stderr.write(result.stderr);
    if (!result.ok) {
      io.stderr.write(result.error ? `${result.error}\n` : "Update command failed.\n");
      return 1;
    }
  }

  return 0;
}

function selectProviders(tool) {
  if (!tool) {
    return {
      ok: true,
      providers
    };
  }

  const provider = findProvider(tool);
  return provider ? {
    ok: true,
    providers: [provider]
  } : {
    ok: false,
    providers: []
  };
}

function writeUnknownTool(tool, json, io) {
  const payload = {
    error: "unknown_tool",
    message: `Unknown tool: ${tool}`,
    supportedTools: providers.map((provider) => provider.id)
  };

  if (json) {
    io.stdout.write(formatJson(payload));
  } else {
    io.stderr.write(`${payload.message}\nSupported tools: ${payload.supportedTools.join(", ")}\n`);
  }

  return 3;
}

function isEntrypoint() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntrypoint()) {
  const code = await main();
  process.exitCode = code;
}
