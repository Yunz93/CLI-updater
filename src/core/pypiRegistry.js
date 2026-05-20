export async function getPyPiLatestVersion(packageName, options = {}) {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const registryUrl = options.registryUrl ?? "https://pypi.org/pypi";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${registryUrl}/${encodeURIComponent(packageName)}/json`, {
      signal: controller.signal,
      headers: {
        "accept": "application/json"
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        version: null,
        error: `PyPI returned HTTP ${response.status}`
      };
    }

    const body = await response.json();
    const version = body?.info?.version;
    if (!version) {
      return {
        ok: false,
        version: null,
        error: "PyPI response did not include info.version"
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
    return `PyPI request timed out after ${timeoutMs}ms`;
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
