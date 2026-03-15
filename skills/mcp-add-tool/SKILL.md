---
name: mcp-add-tool
description: Add a new tool with validation, security review, and tests
tags: [mcp, tool, add]
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Edit"]
---

# /mcp-add-tool — Add a Tool to an MCP Server

Walk through adding a single, well-designed tool to an existing MCP server.

## Instructions

### Step 1: Understand the Tool

Ask the user:

1. **What should this tool do?** Get a clear, one-sentence description.
2. **What inputs does it need?** For each input: name, type, required/optional, constraints.
3. **What does it return?** Text, JSON, image, or error conditions.
4. **Does it need external services?** Database, API, file system, etc.

If the user is vague, help them refine:
> A good MCP tool does one thing well. Instead of "manage users", consider separate tools:
> - `search-users` — Find users by criteria
> - `get-user` — Get a single user by ID
> - `create-user` — Create a new user record

### Step 1.5: Research Project Documentation

Before writing any code, search the project's existing documentation for context about the feature this tool wraps. This step directly improves the quality of tool descriptions and parameter descriptions.

**Search for relevant docs:**
1. Look for markdown files in `docs/`, `wiki/`, `README.md`, or any documentation directory
2. Search for OpenAPI/Swagger specs that describe the endpoint this tool wraps
3. Search source code for JSDoc/TSDoc comments on the function/service this tool calls
4. Look for existing usage examples, guides, or tutorials that mention this feature

**Extract and note:**
- **Domain terminology**: What does the project call things? Use the same terms in descriptions (e.g., if the project says "workspace" not "project", the tool should say "workspace")
- **Usage patterns**: How is this feature typically used? What comes before/after it in a workflow?
- **Related operations**: What other tools/APIs does this feature interact with? (e.g., "use `get-user` to verify the user exists before calling `assign-role`")
- **Constraints and gotchas**: Rate limits, pagination requirements, required preconditions, common error scenarios
- **Error scenarios**: What errors does the API return? What do they mean? How should the caller handle them?

**Apply what you find:**
- Use doc insights to write the tool `description` in Step 5 (registration) — not just "what it does" but "when to use it, what to expect, and what to do next"
- Use doc insights to write better `.describe()` strings on Zod fields in Step 2 — include valid values, formats, and domain context
- If the docs describe a multi-step workflow that includes this tool, mention the workflow in the tool description (e.g., "Part of the user onboarding flow: create-user → assign-roles → send-welcome-email")

If no relevant documentation is found, note this and write the best descriptions you can from the code. Flag to the user that adding docs would improve the AI agent experience.

### Step 2: Design the Schema

Design the Zod input schema following the security baseline:

- Every string gets `.max(N)` — ask what reasonable max is (default: 1000)
- Every number gets `.min()` and `.max()` — ask for valid range
- Every array gets `.max(N)` — ask for max items (default: 100)
- Every field gets `.describe("clear description for AI consumption")`
- Use `.default()` for optional fields with sensible defaults
- Use `z.enum()` instead of free-form strings when values are known
- Use `.optional()` for truly optional fields

Show the user the schema before generating code:
```typescript
z.object({
  query: z.string().min(1).max(200).describe("Search term"),
  limit: z.number().int().min(1).max(100).default(20).describe("Max results"),
})
```

### Step 3: Check Dependencies

If the tool needs external services:

1. Check if a DI provider already exists in `src/index.ts` for this service
2. If not, design and add one:
   ```typescript
   .provide({
     key: "serviceName",
     factory: async () => initializeService(process.env.SERVICE_URL!),
     dispose: async (svc) => svc.close(),
   })
   ```
3. Import or initialize the client at module scope in the tool file

### Step 4: Generate the Tool

Create `src/tools/<tool-name>.ts` with:

```typescript
import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/server";

export const <toolName>Schema = z.object({
  // ... designed schema from Step 2
});

export async function <toolName>Handler(
  args: z.infer<typeof <toolName>Schema>,
  ctx: { mcpReq: { log: (level: string, data: string) => Promise<void> } }
): Promise<CallToolResult> {
  await ctx.mcpReq.log("info", "<tool-name> called");

  try {
    // Implementation
    const result = /* ... */;
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    await ctx.mcpReq.log("error", `<tool-name> failed: ${err instanceof Error ? err.message : String(err)}`);
    return {
      content: [{ type: "text", text: "Failed to <action>. Please try again." }],
      isError: true,
    };
  }
}
```

### Step 5: Register the Tool

Update `src/index.ts` to import and register:

```typescript
import { <toolName>Schema, <toolName>Handler } from "./tools/<tool-name>.js";

server.registerTool(
  "<tool-name>",
  {
    description: "<description for AI consumption>",
    inputSchema: <toolName>Schema,
  },
  <toolName>Handler
);
```

### Step 6: Generate Tests

Create `tests/tools/<tool-name>.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { <toolName>Schema, <toolName>Handler } from "../src/tools/<tool-name>.js";

const mockCtx = { mcpReq: { log: async () => {} } };

describe("<tool-name>", () => {
  it("accepts valid input", () => {
    expect(<toolName>Schema.safeParse({ /* valid input */ }).success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(<toolName>Schema.safeParse({}).success).toBe(false);
  });

  it("returns expected result", async () => {
    const result = await <toolName>Handler({ /* valid input */ }, mockCtx);
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.isError).toBeFalsy();
  });
});
```

### Step 7: Security Review

Run the security checklist from `agents/security.md` on the new tool:

- [ ] Schema has proper constraints (max lengths, ranges)
- [ ] No injection vulnerabilities (SQL, shell, URL)
- [ ] No credential exposure in results
- [ ] Error handling doesn't leak internals
- [ ] Timeout set if calling external services
- [ ] Destructive operations have appropriate safeguards

Fix any issues found before presenting the result.

### Step 8: Verify

1. Run `npm run typecheck` to verify compilation
2. Run `npm test` to verify all tests pass
3. Report results to the user

### Step 9: Summary

Tell the user what was created:
> Added tool `<tool-name>`:
> - Handler: `src/tools/<tool-name>.ts`
> - Tests: `tests/tools/<tool-name>.test.ts`
> - Registered in `src/index.ts`
>
> The tool has N input parameters, validates all inputs, and has tests for happy path, validation, and edge cases.
