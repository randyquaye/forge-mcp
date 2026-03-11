---
name: mcp-add-prompt
description: Add a prompt template to an MCP server
tags: [mcp, prompt, add]
allowed-tools: ["Bash", "Glob", "Read", "Write", "Edit"]
---

# /mcp-add-prompt — Add a Prompt Template

Guide the user through adding a reusable prompt template.

## Instructions

### Step 1: Understand the Prompt

Ask:
1. **What workflow does this prompt support?** (code review, debugging, data analysis, etc.)
2. **What arguments does it need?** Parameters the AI provides when requesting the prompt.
3. **What messages should it generate?** The conversation structure to return.

Prompts are useful for:
- Common multi-step workflows that combine reading resources and calling tools
- Providing context to the AI about how to use the server effectively
- Standardizing interaction patterns

### Step 2: Design Arguments Schema

```typescript
const argsSchema = z.object({
  topic: z.string().describe("The topic to analyze"),
  depth: z.enum(["brief", "detailed"]).default("brief").describe("Analysis depth"),
});
```

### Step 3: Generate the Prompt

Create `src/prompts/<name>.ts`:

```typescript
import { z } from "zod";

export const <name>Args = z.object({
  // ... schema
});

export function <name>Handler(args: z.infer<typeof <name>Args>) {
  return {
    description: "Description of what this prompt does",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Your prompt text using ${args.topic}`,
        },
      },
    ],
  };
};
```

### Step 4: Register, Test, Verify

Register in `src/index.ts` with `.prompt()`, generate tests, run typecheck + tests.
