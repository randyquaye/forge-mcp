---
name: mcp-security
description: Non-negotiable security rules for all MCP server implementations
---

# MCP Security Rules

These rules are mandatory for every MCP server. Violations are CRITICAL audit findings.

## Input Validation
- Every tool MUST have a Zod schema. No `z.any()`, `z.unknown()`, or `z.record(z.any())`.
- String inputs MUST have `.max(N)` constraints. Default max: 1000 characters.
- Number inputs MUST have `.min()` and `.max()` range constraints.
- Array inputs MUST have `.max(N)` length constraints. Default max: 100 items.
- All schema fields MUST have `.describe()` for AI consumption.
- Use `z.enum()` over free-form strings when values are known.

## Injection Prevention
- NEVER concatenate user input into SQL queries. Use parameterized queries (`$1`, `?`).
- NEVER concatenate user input into shell commands. Use `execFile()` with argument arrays.
- NEVER concatenate user input into URLs. Use `URL` constructor and `searchParams`.
- NEVER use `eval()`, `Function()`, or `vm.runInNewContext()` with user input.
- NEVER use `require()` or `import()` with user-controlled paths.

## Path Traversal
- File path inputs MUST be resolved with `path.resolve()` and checked against an allowlist.
- Reject paths containing `..` after normalization.
- Do not follow symbolic links outside allowed directories.

## Credential Protection
- Tool results MUST NOT include environment variable values.
- Tool results MUST NOT include connection strings, API keys, tokens, or passwords.
- Error messages MUST NOT leak internal file paths, stack traces, or connection details.
- Log output MUST NOT include sensitive values.

## Transport Security
- Streamable HTTP transport MUST validate authentication tokens.
- Use `createMcpExpressApp()` for DNS rebinding protection on network transports.
- CORS origins MUST NOT be `*` in production.
- Network-exposed servers MUST have rate limiting.

## Timeouts
- Every tool calling external services MUST have a timeout.
- Use AbortSignal, `Promise.race()`, or client-level timeout configuration.
- Recommend 30 second default timeout for external calls.

## Error Handling
- Use `isError: true` in tool results for user-facing errors.
- NEVER expose raw exception messages to clients.
- Log full error details server-side; return sanitized messages to clients.
