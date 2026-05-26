import { buildMessage, formatManualCommand, parseVersion, readCurrentVersion, statusFromVersions } from "./shared.js";

export function createPyPiCliProvider(config, dependencies) {
  const {
    resolveExecutable,
    runCommand,
    getPyPiLatestVersion
  } = dependencies;

  return {
    id: config.id,
    aliases: config.aliases,
    displayName: config.displayName,
    executable: config.executable,
    packageName: config.packageName,
    registry: "pypi",
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
      const latest = await getPyPiLatestVersion(config.packageName);
      const pythonTool = await inferPythonToolInstallSource(config.packageName, runCommand);
      const installSource = pythonTool.source;
      const errors = [];

      if (!current.ok && pythonTool.version) {
        current = {
          ok: true,
          version: pythonTool.version,
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
      const command = getUpdateCommandForSource(config, checkResult.installSource);
      const canExecute = checkResult.installSource === "pipx" || checkResult.installSource === "uv-tool";
      return {
        id: config.id,
        name: config.displayName,
        currentVersion: checkResult.currentVersion,
        targetVersion: checkResult.latestVersion,
        strategy: canExecute ? checkResult.installSource : "manual",
        commands: [command],
        timeoutMs: config.updateTimeoutMs,
        canExecute,
        requiresConfirmation: canExecute,
        manualInstructions: canExecute
          ? `Run: ${command.join(" ")}`
          : `Run manually: ${formatManualCommand(config)}`,
        riskNotes: canExecute
          ? [
              buildPythonUpdateRiskNote(checkResult.installSource),
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

async function inferPipxInstallSource(packageName, runCommand) {
  const result = await runCommand("pipx", ["list", "--json"], {
    timeoutMs: 5_000
  });

  if (!result.stdout) {
    return "unknown";
  }

  try {
    const parsed = JSON.parse(result.stdout);
    if (parsed?.venvs?.[packageName]) {
      return "pipx";
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

async function inferPythonToolInstallSource(packageName, runCommand) {
  const pipxSource = await inferPipxInstallSource(packageName, runCommand);
  if (pipxSource === "pipx") {
    return {
      source: "pipx",
      version: null
    };
  }

  return inferUvToolInstallSource(packageName, runCommand);
}

async function inferUvToolInstallSource(packageName, runCommand) {
  const result = await runCommand("uv", ["tool", "list", "--show-paths"], {
    timeoutMs: 5_000
  });

  if (!result.stdout) {
    return {
      source: "unknown",
      version: null
    };
  }

  const packageLine = result.stdout.split(/\r?\n/).find((line) => {
    return line === packageName || line.startsWith(`${packageName} `);
  });

  if (!packageLine) {
    return {
      source: "unknown",
      version: null
    };
  }

  return {
    source: "uv-tool",
    version: parseVersion(packageLine)?.normalized ?? null
  };
}

function getUpdateCommandForSource(config, installSource) {
  return config.updateCommandsBySource?.[installSource] ?? config.updateCommand;
}

function buildPythonUpdateRiskNote(installSource) {
  if (installSource === "pipx") {
    return "This updates a pipx-managed Python CLI package.";
  }

  if (installSource === "uv-tool") {
    return "This updates a uv-managed Python CLI package.";
  }

  return "Automatic update is disabled because the install source could not be verified as pipx or uv-tool.";
}
