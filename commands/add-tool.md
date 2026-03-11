---
name: add-tool
description: Add a tool with schema design, security review, and tests
---

# /add-tool

Guided workflow for adding a single tool to an MCP server.

## When to Use
- Adding a new capability to an existing MCP server
- When a user describes a tool they need

## Workflow
1. Understand — what does the tool do? inputs? outputs? external deps?
2. Design — Zod schema with constraints and descriptions
3. Check dependencies — does the server have required clients initialized?
4. Generate — tool handler file in `src/tools/`
5. Register — update `src/index.ts` with `server.registerTool()`
6. Test — generate test file in `tests/tools/`
7. Security review — run checklist from **security** agent
8. Verify — `npm run typecheck && npm test`

## Related Commands
- `/add-resource` — Add a resource
- `/add-prompt` — Add a prompt
- `/audit` — Full security audit
