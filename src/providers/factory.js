import { parseVersion, statusFromVersions } from "../core/semver.js";

export function createNpmCliProvider(config, dependencies) {
  const {
    resolveExecutable,
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
      const installSource = npmPackage.source === "npm-global"
        ? npmPackage.source
        : await inferSelfUpdateInstallSource(executablePath, config, runCommand);
      const errors = [];

      if (!current.ok && npmPackage.version) {
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
      const canExecute = isNpmGlobal || isSelfUpdate;
      const commands = isSelfUpdate
        ? [config.selfUpdateCommand]
        : [config.updateCommand];
      const strategy = isNpmGlobal ? "npm-global" : isSelfUpdate ? "self-update" : "manual";
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
          : `Installation source is unknown. Review the official installer or run manually: ${formatManualCommand(config)}`,
        riskNotes: [
          buildNpmProviderRiskNote(installSource),
          "The command may modify files outside this project.",
          ...(config.riskNotes ?? [])
        ]
      };
    }
  };
}

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
          : `Installation source is unknown. Review the official installer or run manually: ${formatManualCommand(config)}`,
        riskNotes: [
          buildPythonUpdateRiskNote(checkResult.installSource),
          "The command may modify files outside this project.",
          ...(config.riskNotes ?? [])
        ]
      };
    }
  };
}

export function createSelfUpdatingCliProvider(config, dependencies) {
  const {
    resolveExecutable,
    runCommand
  } = dependencies;

  return {
    id: config.id,
    aliases: config.aliases,
    displayName: config.displayName,
    executable: config.executable,
    packageName: null,
    registry: "self",
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
          installSource: "unknown",
          status: "not_installed",
          updateAvailable: false,
          message: `${config.displayName} is not installed or not on PATH.`,
          errors: []
        };
      }

      const current = await readCurrentVersion(config, executablePath, runCommand);
      const errors = [];
      if (!current.ok) {
        errors.push({
          source: "current_version",
          message: current.error
        });
      }

      return {
        id: config.id,
        name: config.displayName,
        installed: true,
        path: executablePath,
        currentVersion: current.version,
        latestVersion: null,
        installSource: "self-update",
        status: current.version ? "unknown" : "error",
        updateAvailable: false,
        message: current.version
          ? `${config.displayName} is installed. Latest version is managed by its self-update command.`
          : `${config.displayName} version could not be read.`,
        errors
      };
    },

    getUpdatePlan(checkResult) {
      const canExecute = checkResult.installed === true;
      return {
        id: config.id,
        name: config.displayName,
        currentVersion: checkResult.currentVersion,
        targetVersion: checkResult.latestVersion,
        strategy: "self-update",
        commands: [config.updateCommand],
        timeoutMs: config.updateTimeoutMs,
        canExecute,
        requiresConfirmation: canExecute,
        manualInstructions: canExecute
          ? `Run: ${config.updateCommand.join(" ")}`
          : `Install first: ${formatManualCommand(config)}`,
        riskNotes: [
          "This runs the tool's official self-update command.",
          "The command may modify files outside this project.",
          ...(config.riskNotes ?? [])
        ]
      };
    }
  };
}

async function readCurrentVersion(config, executablePath, runCommand) {
  const attempts = config.versionArgsList ?? [["--version"]];
  const rawOutputs = [];

  for (const args of attempts) {
    const result = await runCommand(executablePath, args, { timeoutMs: 5_000 });
    const output = `${result.stdout}\n${result.stderr}`.trim();
    rawOutputs.push(output || result.error || "");
    const parsed = parseVersion(output);

    if (result.ok && parsed) {
      return {
        ok: true,
        version: parsed.normalized,
        error: null
      };
    }
  }

  return {
    ok: false,
    version: null,
    error: rawOutputs.filter(Boolean).join(" | ") || "No version output could be parsed"
  };
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

function buildNpmProviderRiskNote(installSource) {
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

function formatManualCommand(config) {
  return (config.manualUpdateCommand ?? config.updateCommand).join(" ");
}

function buildMessage(name, status, currentVersion, latestVersion) {
  if (status === "update_available") {
    return `${name} can be updated from ${currentVersion} to ${latestVersion}.`;
  }

  if (status === "up_to_date") {
    return `${name} is up to date.`;
  }

  if (status === "local_newer") {
    return `${name} local version ${currentVersion} is newer than latest registry version ${latestVersion}.`;
  }

  return `${name} version status is unknown.`;
}
