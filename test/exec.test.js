import test from "node:test";
import assert from "node:assert/strict";
import { runCommand } from "../src/core/exec.js";

test("runCommand streams stdout and stderr while preserving buffered output", async () => {
  const stdoutChunks = [];
  const stderrChunks = [];

  const result = await runCommand(process.execPath, [
    "-e",
    "process.stdout.write('out'); process.stderr.write('err');"
  ], {
    onStdout: (text) => stdoutChunks.push(text),
    onStderr: (text) => stderrChunks.push(text)
  });

  assert.equal(result.ok, true);
  assert.equal(result.stdout, "out");
  assert.equal(result.stderr, "err");
  assert.deepEqual(stdoutChunks, ["out"]);
  assert.deepEqual(stderrChunks, ["err"]);
});

test("runCommand timeout error uses configured timeout", async () => {
  const result = await runCommand(process.execPath, [
    "-e",
    "setTimeout(() => {}, 1000);"
  ], {
    timeoutMs: 25
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /Command timed out after 25ms/);
});
