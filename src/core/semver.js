export function parseVersion(input) {
  if (typeof input !== "string") {
    return null;
  }

  const match = input.match(/(?:^|[^\d])v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
  if (!match) {
    return null;
  }

  return {
    raw: match[0].trim().replace(/^[^\dv]*/, ""),
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? "",
    normalized: `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}${match[4] ? `-${match[4]}` : ""}`
  };
}

export function compareVersions(left, right) {
  const a = typeof left === "string" ? parseVersion(left) : left;
  const b = typeof right === "string" ? parseVersion(right) : right;

  if (!a || !b) {
    return null;
  }

  for (const key of ["major", "minor", "patch"]) {
    if (a[key] > b[key]) return 1;
    if (a[key] < b[key]) return -1;
  }

  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease);
}

export function statusFromVersions(currentVersion, latestVersion) {
  const comparison = compareVersions(currentVersion, latestVersion);
  if (comparison === null) {
    return "unknown";
  }

  if (comparison < 0) return "update_available";
  if (comparison > 0) return "local_newer";
  return "up_to_date";
}
