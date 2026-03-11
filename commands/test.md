---
name: test
description: Generate and run comprehensive tests for an MCP server
agent: testing
---

# /test

Generate tests for all tools, resources, and prompts, then run them.

## When to Use
- After adding new tools or modifying handlers
- Before deployment
- When test coverage is incomplete

## Workflow
1. Inventory all registered tools, resources, prompts
2. Spawn **testing** agent to generate test files
3. Generate mock providers for external dependencies
4. Run `npm test` and report results
5. Fix any failures

## Related Commands
- `/audit` — Security and performance review
- `/add-tool` — Add a tool (includes test generation)
