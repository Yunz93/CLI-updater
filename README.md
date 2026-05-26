# Agent CLI Updater

Agent CLI Updater helps you check and update AI coding command-line tools from one place.

It is built for developers who use several AI CLIs and want a quick answer to:

- Which tools are installed?
- Which versions are currently installed?
- Which tools have updates available?
- What command will be used before an update runs?

## Supported Tools

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

## Requirements

- Node.js 18 or newer

No runtime npm dependencies are required.

## Install

```bash
npm install -g agent-cli-updater
```

### Migrating from `@yunz93/cli-updater`

The package was renamed to `agent-cli-updater`. The CLI command changed from `cli-updater` to `agent-cli-updater`.

```bash
npm uninstall -g @yunz93/cli-updater
npm install -g agent-cli-updater
```

## Usage

Check installed tools:

```bash
agent-cli-updater check
```

Check one tool:

```bash
agent-cli-updater check codex
agent-cli-updater check claude
```

Show all supported tools:

```bash
agent-cli-updater check --include-not-installed
```

List supported tools:

```bash
agent-cli-updater list
```

Preview an update:

```bash
agent-cli-updater update codex --dry-run
```

Run an update:

```bash
agent-cli-updater update codex
```

Use JSON output:

```bash
agent-cli-updater check --json
agent-cli-updater update codex --dry-run --json
```

`update --json` writes one JSON object that includes the pre-update check, plan, and post-update verification when an update runs.

## Update Safety

Updates are shown before they run.

By default, Agent CLI Updater asks for confirmation before executing an update command. If it cannot safely determine how a tool should be updated, it will not run the update automatically and will show manual guidance instead.

## Exit Codes

- `0`: completed successfully
- `1`: command failed
- `2`: update available, or an update ran but the active executable still appears outdated
- `3`: invalid command or argument
