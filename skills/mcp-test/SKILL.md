---
name: mcp-test
description: Generate and run comprehensive tests for an MCP server
tags: [mcp, test, testing]
allowed-tools: ["Bash", "Glob", "Read", "Write", "Edit"]
---

# /mcp-test — Generate & Run MCP Server Tests

Generate comprehensive tests for all tools, resources, and prompts in an MCP server, then run them.

## Instructions

### Step 1: Inventory

Read the MCP server's `src/index.ts` to identify all registered:
- Tools (name, schema, dependencies)
- Resources (URI, type)
- Prompts (name, args schema)

Check `tests/` for existing test files to avoid overwriting.

### Step 2: Generate Tests

Follow the Testing Agent instructions from `agents/testing.md`.

For each **tool** without tests, generate `tests/tools/<name>.test.ts`:

1. **Setup**: Create a `ServerBuilder` with the tool registered and any DI mocks needed
2. **Happy path**: Call with valid inputs, verify result structure and content
3. **Validation**: Test with missing fields, wrong types, out-of-range values — expect error code -32004
4. **Edge cases**: Empty strings, zero values, max-length inputs, special characters
5. **Error handling**: If the tool can fail (external service), test error path returns `isError: true`

For each **resource** without tests, generate `tests/resources/<name>.test.ts`:
1. Read with valid URI, verify contents and MIME type
2. Read with invalid URI, expect error

For each **prompt** without tests, generate `tests/prompts/<name>.test.ts`:
1. Get with valid args, verify message structure
2. Get with invalid args, expect error

Generate `tests/integration.test.ts` if it doesn't exist:
1. Initialize handshake
2. List tools/resources/prompts
3. Verify capabilities match registrations
4. Unknown method returns -32601

### Step 3: Handle DI Dependencies

For tools that use `ctx.getResource()`, create mock providers:

```typescript
.provide({
  key: "db",
  factory: () => ({
    query: async () => ({ rows: [/* mock data */], rowCount: 1 }),
  }),
})
```

Document each mock and what it simulates.

### Step 4: Run Tests

Execute `npm test` and report:
- Total tests: N passed, N failed
- Coverage by category (tools, resources, prompts, integration)
- Any failures with details

If tests fail, diagnose and fix the test (not the implementation, unless there's a real bug).

### Step 5: Report

```
## Test Generation Report

### Generated Files
- tests/tools/search-users.test.ts (5 tests)
- tests/tools/create-user.test.ts (4 tests)
- tests/integration.test.ts (4 tests)

### Results
✓ 13 tests passed
✗ 0 tests failed

### Coverage
- Tools: 3/3 covered
- Resources: 2/2 covered
- Prompts: 1/1 covered
- Integration: ✓
```
