---
name: deploy
description: Generate deployment configs — Docker, CI, Claude Desktop
---

# /deploy

Generate deployment artifacts for an MCP server.

## When to Use
- Ready to deploy an MCP server
- Setting up CI/CD
- Configuring Claude Desktop integration

## Workflow
1. Ask target — Claude Desktop (stdio), Docker (HTTP), CI/CD, or all
2. Generate appropriate configs
3. Generate `.env.example` with required variables
4. Verify generated configs
