---
name: mcp-add-resource
description: Add a resource or resource template to an MCP server
tags: [mcp, resource, add]
allowed-tools: ["Bash", "Glob", "Read", "Write", "Edit"]
---

# /mcp-add-resource — Add a Resource

Guide the user through adding a resource (read-only data) to their MCP server.

## Instructions

### Step 1: Understand the Resource

Ask:
1. **What data does this resource provide?** (config, user profile, document, etc.)
2. **Is it a single resource or a template?**
   - Single: `config://app-settings` — one fixed URI
   - Template: `users://{userId}` — parameterized URI
3. **What format?** JSON, plain text, or binary?
4. **Does it need external data?** Database, API, file system?

### Step 2: Design the URI

Follow MCP URI conventions:
- Use a scheme that describes the domain: `users://`, `config://`, `docs://`
- For templates, use `{paramName}` placeholders: `users://{userId}/profile`
- Keep URIs short and intuitive — they appear in tool descriptions

### Step 3: Generate the Resource

Create `src/resources/<name>.ts`:

```typescript
export async function <name>Handler(uri: URL, params?: Record<string, string>) {

  // Extract params if template resource
  // const id = uri.split("://")[1];

  const data = /* fetch data */;

  return {
    contents: [{
      uri,
      mimeType: "application/json", // or "text/plain"
      text: JSON.stringify(data),
    }],
  };
};
```

### Step 4: Register

Update `src/index.ts`:

For static resources:
```typescript
.resource("config://settings", "App Settings", settingsHandler, {
  description: "Current application configuration",
  mimeType: "application/json",
})
```

For template resources:
```typescript
.resourceTemplate("users://{userId}", "User Profile", userProfileHandler, {
  description: "Read a user profile by ID",
  mimeType: "application/json",
})
```

### Step 5: Generate Test

Create `tests/resources/<name>.test.ts` with:
- Successful read test
- Not-found/error condition test
- MIME type verification
- Content structure verification

### Step 6: Verify

Run `npm run typecheck && npm test` and report results.
