---
name: init
description: Create a new MCP server with guided discovery and code generation
agent: discovery
---

# /init

Full guided MCP server creation workflow.

## When to Use
- Creating an MCP server for an existing project
- Starting a greenfield MCP server
- After running `/discover` to act on recommendations

## Workflow
1. Context gathering — project, name, location
2. Discovery analysis (spawn **discovery** agent if not already done)
3. Design interview — transport, tools, resources, security
4. Code generation — server, tools, resources, prompts, tests
5. Security review (spawn **security** agent)
6. Build and test verification
7. Present next steps

## Related Commands
- `/discover` — Run discovery without generating code
- `/audit` — Review an existing MCP server
- `/deploy` — Generate deployment configs
