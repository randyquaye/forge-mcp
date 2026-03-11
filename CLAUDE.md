# forge-mcp

A Claude Code plugin that enables any Claude agent to build enterprise-grade, production-ready MCP servers. Provides guided skills, specialized agents, security/performance hooks, and code templates — all generating standalone servers using the official `@modelcontextprotocol/sdk`.

## Installation (as Claude Code plugin)

```bash
# Add the marketplace
/plugin marketplace add randyquaye/forge-mcp

# Install the plugin
/plugin install forge-mcp@randyquaye-forge-mcp

# Or test locally during development
claude --plugin-dir /path/to/forge-mcp
```

## Available Skills (via plugin)
- `/forge-mcp:mcp-discover` — Analyze a project to recommend what to expose via MCP
- `/forge-mcp:mcp-init` — Guided MCP server creation with discovery, user interview, and code generation
- `/forge-mcp:mcp-add-tool` — Add a tool with proper validation, security review, and tests
- `/forge-mcp:mcp-add-resource` — Add a resource or resource template
- `/forge-mcp:mcp-add-prompt` — Add a prompt template
- `/forge-mcp:mcp-audit` — Security, performance, and correctness audit
- `/forge-mcp:mcp-test` — Generate and run comprehensive tests
- `/forge-mcp:mcp-deploy` — Generate deployment configs (Docker, CI, Claude Desktop)

## MCP Design Philosophy

When building MCP servers, follow these principles:

1. **Tools are actions, resources are data.** Tools let the AI do something (create, search, modify). Resources let the AI read something (config, state, docs). Never confuse the two.

2. **One tool, one job.** Prefer `search-users` and `get-user` over `manage-users`. Atomic tools compose better and are easier for AI models to reason about.

3. **Descriptions are for AI consumption.** Tool descriptions, parameter descriptions, and resource descriptions are read by language models to decide what to call. Be precise. Include: what the tool does, what each parameter means, what the return value contains, and when to use this tool vs alternatives.

4. **Validate everything.** Every tool MUST use Zod schemas for input validation. Every field MUST have `.describe()`. Never use `z.any()` or `z.unknown()` in tool inputs. The schema is both a validation layer and documentation.

5. **Fail safely.** Tools that interact with external services must have timeouts. Tools that could be expensive must respect concurrency limits. Error responses must be informative but never leak internal details (stack traces, connection strings, file paths).

6. **Module-scoped singletons over globals.** Database pools, API clients, and configuration should be initialized once at module scope (or in a factory), not created per-request. This enables testing and clean shutdown.

## Security Baseline

These rules are non-negotiable for any MCP server:

- **Input validation**: Zod schemas on every tool. Constrain string lengths (`z.string().max(1000)`), number ranges, and enum values. No unbounded inputs.
- **Path safety**: If a tool accepts file paths, resolve against an allowlist and normalize (reject `..`). Never expose arbitrary filesystem access.
- **Injection prevention**: Never construct SQL, shell commands, or URLs by string concatenation from user input. Always parameterize.
- **Credential protection**: Tool results must never include API keys, tokens, passwords, or connection strings. Sanitize before returning.
- **Transport auth**: Streamable HTTP transport MUST validate auth tokens. Use DNS rebinding protection via `createMcpExpressApp()`.
- **Rate limiting**: Network-exposed servers MUST have rate limiting (use Express/Hono middleware).
- **Timeouts**: Every tool that calls external services must have a timeout (AbortSignal, Promise.race, or client-level config).
- **Error hygiene**: Production error responses must not include stack traces or internal paths. Use `isError: true` for user-facing errors.

## Architecture Decision Checklist

Before generating MCP server code, ask and resolve these questions:

1. **Transport**: stdio (for Claude Desktop/local CLI tools) or SSE (for network services)?
2. **External services**: What databases, APIs, or file systems does this server need? Each needs initialization and cleanup.
3. **Secrets**: What credentials are needed? How are they provided (env vars, secret manager)?
4. **Concurrency**: What is the expected load? Set `maxConcurrentTools` accordingly.
5. **Consumer**: Who calls this server? Claude Desktop, a custom host, programmatic clients?
6. **Scope**: What should be exposed vs kept internal? Not every API endpoint needs an MCP tool. Expose what helps the AI accomplish user goals.
7. **Destructive operations**: Which tools modify or delete data? These need extra validation, confirmation patterns, or audit logging.

## Code Patterns

Generated servers use `@modelcontextprotocol/sdk` (the official MCP SDK). No custom framework dependency.

### Tool with external service
```typescript
import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createPool } from "./db.js";

const db = createPool(process.env.DATABASE_URL!);
const server = new McpServer({ name: "my-server", version: "1.0.0" });

server.registerTool(
  "search-users",
  {
    description: "Search users by name or email. Returns matching user records with id, name, and email.",
    inputSchema: z.object({
      query: z.string().min(1).max(200).describe("Search term to match against name or email"),
      limit: z.number().int().min(1).max(100).default(20).describe("Max results to return"),
    }),
  },
  async ({ query, limit }, ctx) => {
    await ctx.mcpReq.log("info", `Searching users: ${query}`);
    const users = await db.query(
      "SELECT id, name, email FROM users WHERE name ILIKE $1 OR email ILIKE $1 LIMIT $2",
      [`%${query}%`, limit]
    );
    return {
      content: [{ type: "text", text: JSON.stringify(users.rows, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Resource with template URI
```typescript
import { ResourceTemplate } from "@modelcontextprotocol/server";

server.registerResource(
  "user-profile",
  new ResourceTemplate("users://{userId}/profile", {
    list: async () => ({
      resources: [
        { uri: "users://123/profile", name: "Alice" },
        { uri: "users://456/profile", name: "Bob" },
      ],
    }),
  }),
  { description: "User profile by ID", mimeType: "application/json" },
  async (uri, { userId }) => {
    const user = await db.query("SELECT id, name, email FROM users WHERE id = $1", [userId]);
    return {
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(user.rows[0]) }],
    };
  }
);
```

### Prompt template
```typescript
server.registerPrompt(
  "review-code",
  {
    description: "Review code for best practices and potential issues",
    argsSchema: z.object({
      code: z.string().describe("The code to review"),
      language: z.string().describe("Programming language"),
    }),
  },
  ({ code, language }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Please review this ${language} code for best practices:\n\n${code}`,
        },
      },
    ],
  })
);
```

### Streamable HTTP transport (for network deployment)
```typescript
import { McpServer, NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/server";

const server = new McpServer({ name: "api-server", version: "1.0.0" });
// ... register tools, resources, prompts ...

const transport = new NodeStreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
});
await server.connect(transport);
```

## Plugin Structure
```
forge-mcp/
├── .claude-plugin/
│   ├── plugin.json              # Plugin manifest
│   └── marketplace.json         # Distribution catalog
├── commands/                    # Quick commands that orchestrate agents + skills
│   ├── discover.md              # /discover — analyze project
│   ├── init.md                  # /init — create MCP server
│   ├── add-tool.md              # /add-tool — add a tool
│   ├── add-resource.md          # /add-resource
│   ├── add-prompt.md            # /add-prompt
│   ├── audit.md                 # /audit — security + perf review
│   ├── test.md                  # /test — generate and run tests
│   └── deploy.md                # /deploy — Docker, CI, Claude Desktop
├── skills/                      # Deep reference skills (HOW to do things)
│   ├── mcp-discover/SKILL.md   # Detailed discovery workflow
│   ├── mcp-init/SKILL.md       # Full guided creation process
│   ├── mcp-add-tool/SKILL.md   # Tool design with security review
│   ├── mcp-add-resource/SKILL.md
│   ├── mcp-add-prompt/SKILL.md
│   ├── mcp-audit/SKILL.md      # Complete audit checklist
│   ├── mcp-test/SKILL.md       # Test generation patterns
│   └── mcp-deploy/SKILL.md     # Deployment configurations
├── agents/                      # Specialized agents (WHO does the work)
│   ├── discovery.md             # Codebase scanner (model: sonnet)
│   ├── security.md              # Vulnerability reviewer (model: opus)
│   ├── performance.md           # Reliability reviewer (model: sonnet)
│   └── testing.md               # Test generator (model: sonnet)
├── rules/                       # Always-follow guidelines (WHAT rules to enforce)
│   └── common/
│       ├── security.md          # Non-negotiable security rules
│       ├── design.md            # Tool/resource/prompt design principles
│       ├── testing.md           # Test coverage requirements
│       └── performance.md       # Performance and reliability rules
├── hooks/
│   └── hooks.json               # PostToolUse automation (schema checks, reminders)
├── templates/                   # Code generation templates (@modelcontextprotocol/sdk)
│   ├── server-entry.ts.hbs
│   ├── tool.ts.hbs
│   ├── resource.ts.hbs
│   ├── prompt.ts.hbs
│   ├── test-tool.ts.hbs
│   ├── middleware.ts.hbs
│   ├── docker/Dockerfile.hbs
│   └── ci/github-actions.yml.hbs
└── archive/                     # Archived framework prototype (reference only)
```

## Component Roles
- **Commands** = WHAT to do (quick orchestration entry points)
- **Skills** = HOW to do it (detailed step-by-step workflows)
- **Agents** = WHO does the work (specialized reviewers with specific tools + models)
- **Rules** = WHAT standards to enforce (always-on guidelines)
- **Hooks** = WHEN to check (automated triggers on file changes)
- **Templates** = Code patterns for generation

## Generated Server Dependencies
Servers created by this plugin depend on:
- `@modelcontextprotocol/sdk` — Official MCP SDK (server, transports)
- `zod` — Input validation and schema generation
- No custom framework — fully standalone, you own all the code
