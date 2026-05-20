# CLI Updater

CLI Updater is a command-line update manager for developer CLI tools.

The MVP focuses on AI coding CLIs:

- Codex CLI
- Claude Code
- Gemini CLI
- Cursor CLI
- Kimi CLI
- Qwen Code
- OpenCode
- Amp
- GitHub Copilot CLI
- Aider

It detects whether each CLI is installed, reads the local version, queries the latest package registry version, compares versions, and reports whether an update is available.

## Requirements

- Node.js 18 or newer

No runtime npm dependencies are required.

## Install

After the package is published:

```bash
npm install -g @yunz93/cli-updater
```

From this repository:

```bash
npm install -g .
```

After installation, run:

```bash
cli-updater check
```

## Usage

```bash
cli-updater check
cli-updater check codex
cli-updater check claude
cli-updater check --json
cli-updater check --include-not-installed
cli-updater list
cli-updater doctor
```

By default, `check` only shows tools that are installed. Use `--include-not-installed` to show every supported provider.

Preview an update command without changing the system:

```bash
cli-updater update codex --dry-run
```

Run an update only after explicit confirmation:

```bash
cli-updater update codex
```

For scripted usage:

```bash
cli-updater update codex --yes
```

## Exit Codes

- `0`: command completed successfully, no update detected
- `1`: command failed
- `2`: update available
- `3`: argument or command error

## Supported Providers

| Provider | Executable | Latest version source | Update command |
| --- | --- | --- | --- |
| Codex CLI | `codex` | `@openai/codex` npm package | `npm install -g @openai/codex@latest` |
| Claude Code | `claude` | `@anthropic-ai/claude-code` npm package | `npm install -g @anthropic-ai/claude-code@latest` |
| Gemini CLI | `gemini` | `@google/gemini-cli` npm package | `npm install -g @google/gemini-cli@latest` |
| Cursor CLI | `cursor-agent` | Cursor self-update command | `cursor-agent update` |
| Kimi CLI | `kimi` | `kimi-cli` PyPI package | `uv tool upgrade kimi-cli` for uv-managed installs |
| Qwen Code | `qwen` | `@qwen-code/qwen-code` npm package | `npm install -g @qwen-code/qwen-code@latest` |
| OpenCode | `opencode` | `opencode-ai` npm package | `npm install -g opencode-ai@latest` |
| Amp | `amp` | `@ampcode/cli` npm package | `npm install -g @ampcode/cli@latest` for npm-managed installs |
| GitHub Copilot CLI | `copilot` | `@github/copilot` npm package | `npm install -g @github/copilot@latest` |
| Aider | `aider` | `aider-chat` PyPI package | `pipx upgrade aider-chat` for pipx-managed installs |

Automatic update execution is only enabled when CLI Updater can verify a safe update path. For example, npm-backed tools must be found in `npm list -g`, Python tools must be found in `pipx list --json` or `uv tool list --show-paths`, and Cursor uses its official `cursor-agent update` self-update command. Otherwise, CLI Updater reports the status and prints manual update guidance.

## Development

Run tests:

```bash
npm test
```

Check the npm package contents:

```bash
npm run pack:check
```

The provider architecture lives in `src/providers`. Shared version comparison, command execution, npm registry access, and output formatting live in `src/core`.

## CI / Release

GitHub Actions workflows:

- `CI` runs `npm test` and `npm run pack:check` on pushes and pull requests to `main` (Node 18, 20, 22).
- `Release` publishes `@yunz93/cli-updater` to npm and creates a GitHub Release when a version tag such as `v0.4.4` is pushed.

The unscoped name `cli-updater` is already taken on npm, so this project publishes under the `@yunz93` scope. The CLI command remains `cli-updater`.

Before the first automated release:

1. Create an npm access token with publish rights.
2. Add it to the GitHub repository as `NPM_TOKEN` (`Settings` → `Secrets and variables` → `Actions`).

Publish a new version:

```bash
npm version patch   # or minor / major
git push origin main --tags
```

The release workflow checks that the tag (without the `v` prefix) matches `package.json`, runs tests, then runs `npm publish --provenance`.
