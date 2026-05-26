import { parseVersion, statusFromVersions } from "../core/semver.js";

export async function readCurrentVersion(config, executablePath, runCommand) {
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

export function buildMessage(name, status, currentVersion, latestVersion) {
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

export function formatManualCommand(config) {
  return (config.manualUpdateCommand ?? config.updateCommand).join(" ");
}

export { parseVersion, statusFromVersions };
