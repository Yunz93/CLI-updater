export async function getNpmLatestVersion(packageName, options = {}) {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const registryUrl = options.registryUrl ?? "https://registry.npmjs.org";
  const encodedName = encodeURIComponent(packageName).replace("%40", "@");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${registryUrl}/${encodedName}`, {
      signal: controller.signal,
      headers: {
        "accept": "application/vnd.npm.install-v1+json, application/json"
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        version: null,
        error: `npm registry returned HTTP ${response.status}`
      };
    }

    const body = await response.json();
    const version = body?.["dist-tags"]?.latest;
    if (!version) {
      return {
        ok: false,
        version: null,
        error: "npm registry response did not include dist-tags.latest"
      };
    }

    return {
      ok: true,
      version,
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      version: null,
      error: formatFetchError(error, timeoutMs)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function formatFetchError(error, timeoutMs) {
  if (error.name === "AbortError") {
    return `npm registry request timed out after ${timeoutMs}ms`;
  }

  const cause = error.cause;
  if (cause?.code) {
    return `${error.message} (${cause.code})`;
  }

  if (cause?.message) {
    return `${error.message}: ${cause.message}`;
  }

  return error.message;
}
