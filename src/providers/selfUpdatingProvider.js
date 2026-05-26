import { formatManualCommand, readCurrentVersion } from "./shared.js";

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
