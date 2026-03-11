---
name: mcp-testing
description: Testing requirements and patterns for MCP servers
---

# MCP Testing Rules

## Coverage Requirements
- Every tool MUST have at least one test file.
- Every tool MUST have tests for: valid input, invalid input (schema rejection), and error conditions.
- Every resource MUST have a read test verifying content structure and MIME type.
- Every prompt MUST have a test verifying message structure.
- An integration test MUST verify the server initializes correctly.

## Test Approach
- Test Zod schemas directly with `safeParse()` for fast validation testing.
- Test handlers directly with mock context for unit testing.
- Mock external dependencies at the module or parameter level.
- Use vitest as the test runner (fast, ESM-native).

## Mock Context Pattern
```typescript
const mockCtx = {
  mcpReq: { log: async () => {} },
};
```

## What to Test
- **Schema validation**: Valid inputs, missing required fields, wrong types, boundary values, max-length strings.
- **Handler logic**: Expected results, error paths, empty results, edge cases.
- **Error responses**: `isError: true` set correctly, error messages are informative but don't leak internals.

## What NOT to Test
- The MCP SDK itself (it's tested upstream).
- Transport layer behavior (tested by the SDK).
- Third-party library internals.

## Naming
- Test files: `tests/tools/<name>.test.ts`, `tests/resources/<name>.test.ts`
- Describe blocks: `describe("<component-name>")`
- Test names: `it("accepts valid input")`, `it("rejects missing required fields")`
