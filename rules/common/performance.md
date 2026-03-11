---
name: mcp-performance
description: Performance and reliability rules for MCP servers
---

# MCP Performance Rules

## Connection Management
- Database connections MUST use pooling. Never create connections per-request.
- HTTP clients MUST be reused. Never instantiate per-tool-call.
- Pool sizes MUST be configured explicitly (not unlimited defaults).
- Idle timeout MUST be set for long-lived connections.

## Timeouts
- Tools calling external APIs MUST have timeouts.
- Database queries SHOULD have statement-level timeouts.
- Recommend 30s default for external calls, 5s for database queries.

## Concurrency
- Avoid synchronous blocking in tool handlers (use async fs, async crypto).
- Identify tools that hold locks or exclusive resources.

## Memory
- Never accumulate unbounded arrays. Paginate or limit results.
- Resource reads MUST return bounded data (not entire tables or files).
- Tool results should be reasonably sized (not megabytes of data).
- Clean up event listeners, timers, and streams.

## Startup & Shutdown
- Handle SIGTERM and SIGINT for graceful shutdown.
- Close database pools and API clients on shutdown.
- Heavy initialization (migrations, cache warming) should be optional or deferred.

## Logging
- Use structured logging via `ctx.mcpReq.log()`.
- Never use `console.log` in tool handlers (stdout is reserved for MCP protocol).
- Log tool execution with timing for observability.
- Log errors with context (tool name, relevant parameters).

## Anti-Patterns to Avoid
- N+1 queries: fetching a list then querying each item. Use JOIN or IN.
- Unbounded reads: `SELECT *` without LIMIT. Always paginate.
- Synchronous file I/O: `readFileSync` in handlers. Use `fs.promises`.
- Over-serialization: converting large objects to JSON repeatedly.
