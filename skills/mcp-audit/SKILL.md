---
name: mcp-audit
description: Security, performance, and correctness audit of an MCP server
tags: [mcp, audit, security, performance]
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Agent"]
---

# /mcp-audit — MCP Server Audit

Perform a comprehensive security, performance, and correctness audit of an MCP server.

## Instructions

### Step 1: Locate the MCP Server

Identify the MCP server to audit:
- If in an MCP server project directory, audit the current project
- If the user specifies a path, use that
- Look for `@modelcontextprotocol/sdk` in dependencies and `McpServer` usage

### Step 2: Read All Server Code

Read these files thoroughly:
1. `src/index.ts` — Server entry point, middleware chain, DI providers
2. All files in `src/tools/` — Tool schemas and handlers
3. All files in `src/resources/` — Resource handlers
4. All files in `src/prompts/` — Prompt handlers
5. `package.json` — Dependencies, scripts
6. Any custom middleware files

### Step 3: Security Audit

Follow the complete Security Agent checklist from `agents/security.md`:

**CRITICAL checks:**
- Input validation on every tool (Zod schemas with constraints)
- No SQL/shell/URL injection via string concatenation
- No path traversal vulnerabilities
- No credential exposure in tool results or errors

**HIGH checks:**
- Transport authentication (mandatory for SSE)
- Rate limiting configured
- Timeouts on all external calls
- Proper error handling (no stack trace leakage)

**MEDIUM checks:**
- Least privilege (minimal data access)
- Audit logging for destructive operations
- Data sanitization in responses

### Step 4: Performance Audit

Follow the Performance Agent checklist from `agents/performance.md`:

- Connection pooling via DI container
- Timeout configuration (global and per-tool)
- Concurrency limits set
- Graceful shutdown with resource cleanup
- No memory leak patterns (unbounded arrays, missing cleanup)
- Structured logging (not console.log)

### Step 5: Correctness Audit

Check MCP protocol compliance and best practices:

- [ ] All tools have descriptions
- [ ] All Zod schema fields have `.describe()`
- [ ] All resources have MIME types
- [ ] No duplicate tool/resource/prompt names
- [ ] Server name and version are set
- [ ] `initialize` response includes correct capabilities
- [ ] Tests exist and pass
- [ ] TypeScript compiles without errors

### Step 5.5: Description Quality Audit

Check that tool descriptions are substantive enough for an AI agent to use correctly without external documentation. For each tool:

- [ ] **Description length**: Flag descriptions under 20 words as `[HIGH] Thin description`. A good description is 2-4 sentences.
- [ ] **When-to-use guidance**: Description should explain when to use this tool vs alternatives (e.g., "Use search-users for partial matches; use get-user when you have the exact ID"). Flag if missing as `[MEDIUM] Missing usage guidance`.
- [ ] **Return value described**: Description should mention what the return value contains. Flag if missing as `[MEDIUM] Return value not described`.
- [ ] **Parameter descriptions**: Each `.describe()` should include more than just the field name restated. Flag `.describe("The user ID")` or `.describe("query")` as `[MEDIUM] Generic parameter description` — it should say something like `.describe("The user's UUID, found in the response from create-user or search-users")`.
- [ ] **Domain context**: If the project has documentation (check for `docs/`, `README.md`, OpenAPI specs), compare tool descriptions against it. Flag tools that don't use the project's own terminology or miss important context as `[MEDIUM] Description not informed by project docs`.
- [ ] **Related tools mentioned**: If a tool is commonly used in sequence with others, the description should mention this. Flag isolated descriptions for tools that clearly participate in workflows as `[LOW] Consider mentioning related tools`.

Present description quality findings in the report alongside security and performance findings.

### Step 6: Generate Report

Present findings in priority order:

```
## MCP Server Audit Report: <server-name>

### Summary
| Category | Critical | High | Medium | Pass |
|----------|----------|------|--------|------|
| Security | N | N | N | N |
| Performance | N | N | N | N |
| Correctness | N | N | N | N |

### Critical Findings
#### [CRITICAL-1] <title>
**File**: path:line
**Issue**: Clear description
**Fix**: Specific code change
**Why**: What could go wrong if not fixed

### High Findings
...

### Medium Findings
...

### Passed Checks
- ✓ All tools have Zod schemas
- ✓ Rate limiting configured
- ...
```

### Step 7: Offer Fixes

For each finding, offer to fix it:
> I found N issues. Would you like me to fix them? I'll address critical issues first.

Apply fixes directly to the code, then re-run the affected checks to verify.

### Step 8: Re-verify

After fixes:
1. Run `npm run typecheck`
2. Run `npm test`
3. Confirm all findings are resolved
