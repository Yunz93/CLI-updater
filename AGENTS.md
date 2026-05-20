# CLI Updater Project Notes

## Project Purpose

This repository is for a command-line update manager that helps users manage updates for CLI software that cannot reliably auto-update inside terminal environments.

The tool should provide a unified CLI workflow to:

- Detect installed CLI tools.
- Check each tool's current local version.
- Compare against the latest available version.
- Report available updates clearly.
- Guide or execute update commands where safe.

Primary target tools include mainstream AI coding CLIs such as:

- Claude Code
- Codex CLI

The design should remain extensible for other CLI tools.

## Product Direction

- The product itself should be a CLI-first tool.
- Prioritize reliable version detection and update checks over UI richness.
- Prefer explicit, inspectable behavior over hidden automation.
- Keep commands predictable for users who work primarily in terminals.
- Avoid tool-specific hacks unless they are isolated behind adapter/provider boundaries.

## Implementation Guidance

- Model each supported CLI as a provider/adapter with clear responsibilities:
  - detect installation
  - read current version
  - fetch or infer latest version
  - expose update instructions or update command
- Keep shared update orchestration separate from provider-specific logic.
- Treat update execution as higher risk than version checking; require explicit user intent before running update commands.
- Make dry-run/check-only behavior easy to access.
- Prefer structured command output where it helps future automation, such as JSON mode.

## Verification Expectations

- Add focused tests for version parsing, provider detection, and update comparison logic.
- For command execution paths, test argument construction without performing real destructive updates.
- When adding a new provider, include sample command outputs or fixtures where practical.

## Communication

- The user often discusses product direction in Chinese. Continue in Chinese when the task is Chinese.
- Preserve explicit scope constraints from the user.
