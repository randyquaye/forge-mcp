---
name: discover
description: Quick project analysis — what should this project expose via MCP?
agent: discovery
---

# /discover

Analyze the current project and produce a structured recommendation of MCP tools, resources, and prompts.

## When to Use
- Starting a new MCP server project
- Evaluating whether a project needs an MCP server
- Before running `/init` to understand the landscape

## Workflow
1. Spawn the **discovery** agent to scan the project
2. Present findings as a structured table
3. Offer to proceed to `/init` with findings pre-loaded
