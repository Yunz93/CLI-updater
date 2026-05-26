export function formatCheckResults(results) {
  const lines = ["Agent CLI Updater", ""];

  for (const result of results) {
    lines.push(formatResultLine(result));
    if (result.errors?.length) {
      for (const error of result.errors) {
        lines.push(`  ${error.source}: ${error.message}`);
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

export function formatProviderList(providers) {
  const lines = ["Supported tools", ""];
  for (const provider of providers) {
    lines.push(`${provider.id.padEnd(10)} ${provider.displayName} (${provider.executable}, ${provider.registry})`);
  }

  return `${lines.join("\n")}\n`;
}

export function formatJson(payload) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function formatUpdatePlan(plan, dryRun) {
  const commandHeader = plan.canExecute ? "Commands:" : "Manual command:";
  const lines = [
    dryRun ? "Dry-run update plan" : "Update plan",
    "",
    `${plan.name}: ${plan.currentVersion ?? "unknown"} -> ${plan.targetVersion ?? "latest"}`,
    `Strategy: ${plan.strategy}`,
    "",
    commandHeader
  ];

  for (const command of plan.commands) {
    lines.push(`  ${command.join(" ")}`);
  }

  if (plan.riskNotes?.length) {
    lines.push("", "Notes:");
    for (const note of plan.riskNotes) {
      lines.push(`  ${note}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function formatUpdateVerification(plan, result) {
  const lines = ["", "Post-update check", ""];
  const current = result.currentVersion ?? "unknown";
  const target = plan.targetVersion ?? "latest";

  lines.push(`${result.name}: ${current} -> ${target}    ${result.status}`);

  if (result.errors?.length) {
    for (const error of result.errors) {
      lines.push(`  ${error.source}: ${error.message}`);
    }
  }

  if (result.status === "update_available") {
    lines.push("", "Update command completed, but the active executable still appears outdated.");
    lines.push("Check PATH order or remove older installations that shadow the updated binary.");
  }

  if (result.errors?.some((error) => error.source === "multiple_installations")) {
    lines.push("", "Update command completed, but multiple installations remain on PATH.");
    lines.push("The first matching executable on PATH is the one your shell will run.");
  }

  if (result.status === "up_to_date") {
    lines.push("", "Update command completed and the active executable is up to date.");
  } else if (result.status !== "update_available") {
    lines.push("", "Update command completed, but the final version status could not be confirmed.");
  }

  return `${lines.join("\n")}\n`;
}

function formatResultLine(result) {
  if (!result.installed) {
    return `${result.name.padEnd(12)} not installed`;
  }

  const current = result.currentVersion ?? "unknown";
  const latest = result.latestVersion ?? "unknown";

  if (result.installSource === "self-update") {
    if (result.status === "update_available") {
      return `${result.name.padEnd(12)} ${current} -> ${latest}    update available`;
    }

    if (result.status === "up_to_date") {
      return `${result.name.padEnd(12)} ${current}             up to date`;
    }

    return `${result.name.padEnd(12)} ${current}             self-update managed`;
  }

  if (result.status === "update_available") {
    return `${result.name.padEnd(12)} ${current} -> ${latest}    update available`;
  }

  if (result.status === "up_to_date") {
    return `${result.name.padEnd(12)} ${current}             up to date`;
  }

  return `${result.name.padEnd(12)} ${current} -> ${latest}    ${result.status}`;
}
