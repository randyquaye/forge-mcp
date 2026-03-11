# forge-mcp Framework (Archived)

This was an early iteration of the forge-mcp project — a custom TypeScript MCP server framework that would have been a runtime dependency for generated MCP servers.

## What It Was
A from-scratch MCP server library providing:
- **Fluent builder API**: `createServer({...}).tool(...).resource(...).build()`
- **Tool executor**: Zod validation, middleware chains, concurrency control (semaphore pattern), configurable timeouts with AbortSignal
- **Registry**: Auto-converts Zod schemas to JSON Schema for MCP protocol compliance
- **DI Container**: Lazy initialization, reverse-order disposal, circular dependency detection
- **Transports**: Stdio (newline-delimited JSON) and SSE (HTTP server with CORS, health checks)
- **Middleware system**: Server-level (every request) + tool-level (every tool call) — rate limiting, bearer/API-key auth, structured logging
- **Test harness**: Bypasses transport layer, sends JSON-RPC directly to server for fast testing
- **CLI scaffolding**: `forge-mcp init`, `add:tool`, `add:resource`, `add:prompt`
- **Response helpers**: `text()`, `json()`, `error()`, `image()`, `content()`

## Why It Was Archived
The project's purpose is to be a **Claude Code plugin** — providing skills, agents, hooks, and templates that guide Claude agents through building MCP servers. Generated MCP servers should be standalone and use the official `@modelcontextprotocol/sdk` instead of a custom framework dependency. This removes coupling and aligns with the ecosystem standard.

The framework code here demonstrates solid patterns (middleware chains, DI, concurrent execution, structured logging) that informed the templates and agent guidance in the plugin. It may be useful as reference material.

## Stats at Time of Archival
- 24 tests passing (server protocol, middleware, DI container)
- Full TypeScript with ESM + DTS output via tsup
- ~1200 lines of framework code across 13 source files
- Dependencies: zod, zod-to-json-schema, pino (dev: tsup, typescript, vitest)

## To Run (if restoring)
```bash
cd archive/forge-mcp-framework
npm install
npm run build
npm test
```
