import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

const WINDOWS_EXTENSIONS = [".EXE", ".CMD", ".BAT", ".COM"];

export async function resolveExecutable(command, env = process.env) {
  const pathValue = env.PATH ?? "";
  const directories = pathValue.split(path.delimiter).filter(Boolean);
  const candidates = [];

  for (const directory of directories) {
    candidates.push(path.join(directory, command));
    if (process.platform === "win32" && !path.extname(command)) {
      for (const extension of WINDOWS_EXTENSIONS) {
        candidates.push(path.join(directory, `${command}${extension}`));
      }
    }
  }

  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Keep searching PATH.
    }
  }

  return null;
}

export function runCommand(command, args = [], options = {}) {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const heartbeatMs = options.heartbeatMs ?? null;
  const heartbeatLabel = options.heartbeatLabel ?? `${command} ${args.join(" ")}`.trim();

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const startedAt = Date.now();
    let lastOutputAt = Date.now();
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      clearInterval(heartbeatTimer);
      child.kill("SIGTERM");
      resolve({
        ok: false,
        code: null,
        stdout,
        stderr,
        error: `Command timed out after ${timeoutMs}ms`
      });
    }, timeoutMs);
    const heartbeatTimer = heartbeatMs ? setInterval(() => {
      if (settled) return;
      const elapsedMs = Date.now() - lastOutputAt;
      if (elapsedMs >= heartbeatMs) {
        options.onStderr?.(`[still running] ${heartbeatLabel} (${Math.round((Date.now() - startedAt) / 1000)}s elapsed)\n`);
        lastOutputAt = Date.now();
      }
    }, heartbeatMs) : null;
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      lastOutputAt = Date.now();
      options.onStdout?.(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      lastOutputAt = Date.now();
      options.onStderr?.(text);
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(heartbeatTimer);
      resolve({
        ok: false,
        code: null,
        stdout,
        stderr,
        error: error.message
      });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(heartbeatTimer);
      resolve({
        ok: code === 0,
        code,
        stdout,
        stderr,
        error: code === 0 ? null : `Command exited with code ${code}`
      });
    });
  });
}
