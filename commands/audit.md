---
name: audit
description: Security, performance, and correctness audit of an MCP server
agent: security
---

# /audit

Comprehensive review of an existing MCP server.

## When to Use
- Before deploying an MCP server to production
- After adding new tools or modifying handlers
- Periodic security review
- When the PostToolUse hook warns about modified tool files

## Workflow
1. Read all server source code
2. Spawn **security** agent — check for injection, validation gaps, credential exposure, transport auth
3. Spawn **performance** agent — check for pooling, timeouts, concurrency, memory, shutdown
4. Check correctness — descriptions, MIME types, schema completeness
5. Check description quality — flag thin descriptions, missing usage guidance, generic parameter descriptions, and descriptions not informed by project docs
6. Generate severity-ranked report
7. Offer to fix findings

## Verdicts
- **PASS** — No critical or high findings
- **WARNING** — High findings present, should fix before production
- **BLOCK** — Critical findings, must fix before deployment

## Related Commands
- `/test` — Generate and run tests
- `/init` — Create a new server (includes audit)
