<p align="center"><img src="assets/logo.svg" width="96" alt="Rig Security"></p>

# Rig Security

Ask Rig Security how every identity reaches your systems: humans, non-human identities and AI agents, their access paths, posture findings and threat detections. Read-only, hosted, OAuth sign-in, nothing to run locally.

Connect your coding agent to [Rig Security](https://rig.security). The plugin adds Rig's hosted, read-only MCP server at `https://api.rigsecurity.io/mcp`. You sign in with your Rig account in the browser; nothing runs on your machine.

You need an active Rig account. The agent reads data from the Rig organization you pick when you sign in.

## Install

### Cursor

From the marketplace: open **Customize**, search for **Rig Security**, and select **Install**. Sign in when the browser opens.

One-click install of the MCP server only:

[![Add Rig Security MCP server to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=rig&config=eyJ0eXBlIjoiaHR0cCIsInVybCI6Imh0dHBzOi8vYXBpLnJpZ3NlY3VyaXR5LmlvL21jcCJ9)

Or paste this link into your browser: `cursor://anysphere.cursor-deeplink/mcp/install?name=rig&config=eyJ0eXBlIjoiaHR0cCIsInVybCI6Imh0dHBzOi8vYXBpLnJpZ3NlY3VyaXR5LmlvL21jcCJ9`

Manual setup: add the server to `~/.cursor/mcp.json`, then sign in from **Customize → MCPs → rig → Authenticate**.

```json
{
  "mcpServers": {
    "rig": { "type": "http", "url": "https://api.rigsecurity.io/mcp" }
  }
}
```

### Claude Code

```bash
claude mcp add --transport http rig https://api.rigsecurity.io/mcp
```

Run `/mcp` in Claude Code and select **rig** to sign in.

To install it as a plugin instead:

```text
/plugin marketplace add rigsecurity/agent-plugins
/plugin install rig-security@rig-security
```

### Codex

```bash
codex mcp add rig --url https://api.rigsecurity.io/mcp
codex mcp login rig
```

To install it as a plugin instead:

```bash
codex plugin marketplace add rigsecurity/agent-plugins
codex plugin add rig-security@rig-security
```

### Any other MCP client

[add-mcp](https://github.com/neon-solutions/add-mcp) writes the server into the config of Cursor, Claude Code, Codex, VS Code and other clients:

```bash
npx add-mcp https://api.rigsecurity.io/mcp -n rig
```

## Sign-in and access

### OAuth (default)

The first time the agent connects, your client opens Rig's sign-in page at `https://oauth.rigsecurity.io` in your browser:

1. Sign in through the Rig console with your usual Rig login.
2. Check the app on the consent page. An app that Rig can verify is shown by its domain. An app that registered itself is marked **unverified**, because Rig can't confirm who publishes it. Allow a connection only if you started it yourself.
3. Pick the Rig organization the agent should use. If you belong to one organization, the page shows it and there is nothing to pick.
4. Select **Allow**.

The client stores the session and renews it while it can. When the session ends, the client asks you to sign in again.

The agent reads only what your Rig role allows in the organization you picked. It can't change anything.

To disconnect an app, open [your connections](https://oauth.rigsecurity.io/connections) and select **Disconnect** next to it. The app is signed out within 10 minutes. Signing out in your client (**Customize → MCPs** in Cursor, `/mcp` in Claude Code, `codex mcp logout rig` in Codex) only removes the session stored in that client.

For administrators:

- If your organization restricts MCP servers, add `https://api.rigsecurity.io/mcp` to the allowlist.
- Sign-in uses `https://oauth.rigsecurity.io` and the Rig console at `https://app.rigsecurity.io`. Allow both hosts in your proxy.
- Cursor signs in through `https://www.cursor.com/agents/mcp/oauth/callback` (web and cloud agents) and `http://localhost:8787/callback` (desktop app). Make sure your proxy allows both.

### API key (fallback)

Use an API key for clients that cannot complete a browser sign-in, such as headless or CI environments.

1. In the Rig app, open **Settings → API Tokens** and create a token. Grant the read scopes you need: `inventory:read`, `posture:read`, `detections:read`, `compliance:read`, `access:read`, `connectors:read`, `audit-logs:read`. Tools outside the token's scopes return an error.
2. Export it: `export RIG_API_KEY=rig_sk_v1_...`
3. Configure your client to send it as a bearer token.

Cursor (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "rig": {
      "type": "http",
      "url": "https://api.rigsecurity.io/mcp",
      "headers": { "Authorization": "Bearer ${env:RIG_API_KEY}" }
    }
  }
}
```

Claude Code (stores the key in your Claude Code config):

```bash
claude mcp add --transport http rig https://api.rigsecurity.io/mcp --header "Authorization: Bearer $RIG_API_KEY"
```

Codex (reads the key from the environment on each start):

```bash
codex mcp add rig --url https://api.rigsecurity.io/mcp --bearer-token-env-var RIG_API_KEY
```

Treat the key like a password. Revoke it from **Settings → API Tokens** when you no longer need it.

## What you can ask

All 32 tools are read-only. With an API key, each area needs the matching read scope. With OAuth sign-in, each tool returns only what your Rig role allows in the organization you picked.

| Area | Scope | Tools |
|---|---|---|
| Session | none | `whoami` |
| Inventory | `inventory:read` | `list_identities`, `get_identity`, `list_devices`, `get_device`, `list_applications`, `get_application`, `list_non_human_identities`, `get_non_human_identity`, `list_ai_agents`, `get_ai_agent`, `list_technologies` |
| Posture | `posture:read` | `list_posture_findings`, `get_posture_finding`, `get_posture_finding_remediation`, `list_posture_rules`, `get_posture_rule` |
| Detections | `detections:read` | `list_threat_detections`, `get_threat_detection`, `list_detection_rules` |
| Access | `access:read` | `list_identity_access`, `list_resource_access`, `explain_access_path` |
| Compliance | `compliance:read` | `list_compliance_frameworks`, `list_compliance_controls`, `list_framework_controls` |
| Connectors | `connectors:read` | `list_connectors`, `list_available_connectors`, `list_connector_scans` |
| Audit logs | `audit-logs:read` | `search_audit_logs`, `aggregate_audit_logs`, `list_audit_log_fields` |

List tools take `cursor` and `limit` and return `next_cursor` when there are more results.

Example prompts:

- "Which critical posture findings were opened this week, and how do I fix the top one?"
- "Who can access the `payments-prod` AWS account, and through which groups?"
- "List the AI agents in our environment and what they can reach."
- "Show the detection findings for jane@example.com from the last 7 days."
- "Which connectors are failing to sync?"

## Security and privacy

- **Read-only.** The server exposes no tools that change data in Rig.
- **Your account.** Every call runs as you, in the organization you picked. It reads only that organization's data, and only what your Rig role allows.
- **Where data goes.** Tool calls go from your client to `https://api.rigsecurity.io/mcp` and nowhere else. Rig receives only the tool calls your agent makes and their arguments, not your conversation or your code. Your client sends tool results to the model you use, under that client's data policy.
- **Logging and limits.** Rig logs request metadata (route, status, request ID, timing) and applies the same rate limits as the Rig public API.
- **Untrusted content.** Tool results include names and descriptions that come from your connected systems and may be set by third parties. Treat them as data, not instructions.
- **No code runs locally.** This plugin is configuration and documentation only.
- **Lost device or client.** Disconnect it from [your connections](https://oauth.rigsecurity.io/connections). Revoke any API key it held from **Settings → API Tokens**.

Read the [Rig Security privacy policy](https://www.rig.security/privacy-policy/).

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Troubleshooting

| Problem | What to do |
|---|---|
| The server shows **Needs authentication** or returns 401 | Sign in again from your client's MCP settings. With an API key, check that the key is set in the environment and not revoked. |
| The agent sees the wrong organization's data | Disconnect the app from [your connections](https://oauth.rigsecurity.io/connections), sign out of the `rig` server in your client, then sign in again and pick the right organization. |
| The browser sign-in never returns to Cursor | Another process may be using port 8787, or a proxy may block `localhost`. Free the port, or sign in from Cursor on the web. |
| The server is blocked or does not appear | Your organization may restrict MCP servers. Ask an admin to allow `https://api.rigsecurity.io/mcp`. |
| Tools do not appear after install | Reload the window in Cursor (**Developer: Reload Window**) or restart the client. |
| A tool returns a permission error | Your account, or your API key's scopes, does not cover that area. |
| Requests fail with 429 | You hit the rate limit. Wait a minute and retry. |

## Support

Email [support@rig.security](mailto:support@rig.security). For security issues, follow [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
