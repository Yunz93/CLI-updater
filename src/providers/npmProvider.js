import { realpath } from "node:fs/promises";
import { buildMessage, formatManualCommand, readCurrentVersion, statusFromVersions } from "./shared.js";

export function createNpmCliProvider(config, dependencies) {
  const {
    resolveExecutable,
    resolveAllExecutables,
    runCommand,
    getNpmLatestVersion
  } = dependencies;

  return {
    id: config.id,
    aliases: config.aliases,
    displayName: config.displayName,
    executable: config.executable,
    packageName: config.packageName,
    registry: "npm",
    updateCommand: config.updateCommand,

    async check() {
      const executablePath = await resolveExecutable(config.executable);
      if (!executablePath) {
        return {
          id: config.id,
          name: config.displayName,
          installed: false,
          path: null,
          currentVersion: null,
          latestVersion: null,
          status: "not_installed",
          updateAvailable: false,
          message: `${config.displayName} is not installed or not on PATH.`,
          errors: []
        };
      }

      let current = await readCurrentVersion(config, executablePath, runCommand);
      const latest = await getNpmLatestVersion(config.packageName);
      const npmPackage = await inferNpmGlobalPackage(config.packageName, runCommand);
      const executableKind = await classifyNpmCliExecutable(executablePath, config.packageName);
      const installSource = await inferNpmCliInstallSource(
        executableKind,
        config,
        executablePath,
        runCommand
      );
      const errors = [];

      if (config.warnMultipleExecutables && resolveAllExecutables) {
        const conflictMessage = await discoverExecutableConflicts(
          config,
          executablePath,
          resolveAllExecutables,
          runCommand
        );
        if (conflictMessage) {
          errors.push({
            source: "multiple_installations",
            message: conflictMessage
          });
        }
      }

      if (!current.ok && npmPackage.version && executableKind === "npm-global") {
        current = {
          ok: true,
          version: npmPackage.version,
          error: null
        };
      }

      if (!current.ok) {
        errors.push({
          source: "current_version",
          message: current.error
        });
      }

      if (!latest.ok) {
        errors.push({
          source: "latest_version",
          message: latest.error
        });
      }

      let status = "unknown";
      if (current.version && latest.version) {
        status = statusFromVersions(current.version, latest.version);
      }

      return {
        id: config.id,
        name: config.displayName,
        installed: true,
        path: executablePath,
        currentVersion: current.version,
        latestVersion: latest.version,
        installSource,
        status,
        updateAvailable: status === "update_available",
        message: buildMessage(config.displayName, status, current.version, latest.version),
        errors
      };
    },

    getUpdatePlan(checkResult) {
      const installSource = checkResult.installSource;
      const isNpmGlobal = installSource === "npm-global";
      const isSelfUpdate = installSource === "self-update";
      const canExecuteFallback = installSource === "unknown" && config.allowFallbackUpdate === true;
      const canExecute = isNpmGlobal || isSelfUpdate || canExecuteFallback;
      const commands = isSelfUpdate
        ? [[checkResult.path ?? config.executable, "update"]]
        : [config.updateCommand];
      const strategy = isNpmGlobal ? "npm-global" : isSelfUpdate ? "self-update" : canExecuteFallback ? "fallback" : "manual";
      const runCommandText = commands[0].join(" ");

      return {
        id: config.id,
        name: config.displayName,
        currentVersion: checkResult.currentVersion,
        targetVersion: checkResult.latestVersion,
        strategy,
        commands,
        timeoutMs: config.updateTimeoutMs,
        canExecute,
        requiresConfirmation: canExecute,
        manualInstructions: canExecute
          ? `Run: ${runCommandText}`
          : `Run manually: ${formatManualCommand(config)}`,
        riskNotes: canExecute
          ? [
              buildNpmProviderRiskNote(installSource, canExecuteFallback),
              "The command may modify files outside this project.",
              ...(config.riskNotes ?? [])
            ]
          : [
              "Automatic update is disabled because the install source could not be verified.",
              ...(config.riskNotes ?? [])
            ]
      };
    }
  };
}

async function classifyNpmCliExecutable(executablePath, packageName) {
  let normalized = executablePath.replaceAll("\\", "/");

  try {
    normalized = (await realpath(executablePath)).replaceAll("\\", "/");
  } catch {
    // Keep the unresolved path when realpath fails.
  }

  if (normalized.includes(`/node_modules/${packageName}/`)) {
    return "npm-global";
  }

  if (normalized.includes("/.codex/packages/standalone/")) {
    return "standalone";
  }

  if (normalized.includes("/Codex.app/Contents/Resources/")) {
    return "app-bundle";
  }

  return "unknown";
}

async function inferNpmCliInstallSource(executableKind, config, executablePath, runCommand) {
  if (executableKind === "npm-global") {
    return "npm-global";
  }

  if (executableKind === "standalone" || executableKind === "app-bundle") {
    return inferSelfUpdateInstallSource(executablePath, config, runCommand);
  }

  return inferSelfUpdateInstallSource(executablePath, config, runCommand);
}

async function discoverExecutableConflicts(config, activePath, resolveAllExecutables, runCommand) {
  const paths = await resolveAllExecutables(config.executable);
  if (paths.length <= 1) {
    return null;
  }

  const activeResolved = await resolveExecutablePath(activePath);
  const installations = [];
  for (const executablePath of paths) {
    const current = await readCurrentVersion(config, executablePath, runCommand);
    if (current.version) {
      installations.push({
        path: executablePath,
        resolvedPath: await resolveExecutablePath(executablePath),
        version: current.version
      });
    }
  }

  const versions = new Set(installations.map((installation) => installation.version));
  if (versions.size <= 1) {
    return null;
  }

  const others = installations
    .filter((installation) => installation.resolvedPath !== activeResolved)
    .map((installation) => `${installation.path} (${installation.version})`);

  return `Multiple ${config.executable} installations on PATH have different versions. Others: ${others.join(", ")}.`;
}

async function resolveExecutablePath(executablePath) {
  try {
    return await realpath(executablePath);
  } catch {
    return executablePath;
  }
}

async function inferSelfUpdateInstallSource(executablePath, config, runCommand) {
  if (!config.selfUpdateCommand) {
    return "unknown";
  }

  const result = await runCommand(executablePath, ["update", "--help"], {
    timeoutMs: 5_000
  });

  if (result.ok) {
    return "self-update";
  }

  return "unknown";
}

function buildNpmProviderRiskNote(installSource, fallback = false) {
  if (fallback) {
    return "Install source could not be verified; this runs the configured fallback update command.";
  }

  if (installSource === "npm-global") {
    return "This updates a globally installed npm package.";
  }

  if (installSource === "self-update") {
    return "This runs the tool's official self-update command.";
  }

  return "Automatic update is disabled because the install source could not be verified as npm-global or self-update.";
}

async function inferNpmGlobalPackage(packageName, runCommand) {
  const result = await runCommand("npm", ["list", "-g", packageName, "--depth=0", "--json"], {
    timeoutMs: 5_000
  });

  if (!result.stdout) {
    return {
      source: "unknown",
      version: null
    };
  }

  try {
    const parsed = JSON.parse(result.stdout);
    const dependency = parsed?.dependencies?.[packageName];
    if (dependency) {
      return {
        source: "npm-global",
        version: dependency.version ?? null
      };
    }
  } catch {
    return {
      source: "unknown",
      version: null
    };
  }

  return {
    source: "unknown",
    version: null
  };
}
