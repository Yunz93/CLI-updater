export function formatCheckResults(results) {
  const lines = ["CLI Updater", ""];

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
  const lines = [
    dryRun ? "Dry-run update plan" : "Update plan",
    "",
    `${plan.name}: ${plan.currentVersion ?? "unknown"} -> ${plan.targetVersion ?? "latest"}`,
    `Strategy: ${plan.strategy}`,
    "",
    "Commands:"
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

function formatResultLine(result) {
  if (!result.installed) {
    return `${result.name.padEnd(12)} not installed`;
  }

  const current = result.currentVersion ?? "unknown";
  const latest = result.latestVersion ?? "unknown";

  if (result.installSource === "self-update") {
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
