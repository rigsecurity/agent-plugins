# Security policy

## Reporting a vulnerability

Email [support@rig.security](mailto:support@rig.security) with "Security" in the subject line. Include:

- what you found and where (this repository, the MCP server at `https://api.rigsecurity.io/mcp`, or the sign-in service at `https://oauth.rigsecurity.io`)
- steps to reproduce
- the impact you expect

Please do not open a public GitHub issue for security reports, and do not include customer data in your report.

We will acknowledge your report and keep you updated until the issue is resolved.

## Scope

This repository contains only plugin configuration and documentation. It ships no executable code.

In scope:

- the hosted MCP server at `https://api.rigsecurity.io/mcp` and the data it returns
- the sign-in service at `https://oauth.rigsecurity.io`, including its sign-in, consent and connections pages

## Lost device or client

If a device or a client that was signed in to Rig is lost or compromised, open [your connections](https://oauth.rigsecurity.io/connections) and disconnect it. If it held an API key, revoke the key in the Rig app under **Settings → API Tokens**.

## Supported versions

Only the latest release of the plugin is supported.
