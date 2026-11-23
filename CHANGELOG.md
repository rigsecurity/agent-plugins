# Changelog

All notable changes to this plugin are recorded here. Versions follow [Semantic Versioning](https://semver.org).

## 0.2.0

- Four skills that walk the agent through common questions with the `rig` tools: `triage-finding`, `identity-blast-radius`, `ai-agent-inventory` and `who-can-access`.
- Cursor loads them from `skills/` through the manifest; Claude Code and Codex pick them up from the same folder.

## 0.1.0

- The `rig` MCP server at `https://api.rigsecurity.io/mcp`: hosted, read-only, OAuth sign-in with an API key fallback.
- Manifests for Cursor (`.cursor-plugin/`), and for Claude Code and Codex (`.claude-plugin/`), sharing one `mcp.json`.
