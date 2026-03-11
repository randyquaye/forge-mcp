---
name: mcp-init
description: Guided MCP server creation with discovery and code generation
tags: [mcp, init, scaffold, create]
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Write", "Edit", "Agent"]
---

# /mcp-init — Guided MCP Server Creation

Create a production-ready MCP server through an intelligent, guided process. This skill combines project analysis, user interview, code generation, and security validation.

## Instructions

You are guiding the user through creating an enterprise-grade MCP server. Follow these steps precisely. Be thorough but don't overwhelm — ask focused questions and make smart defaults.

### Step 1: Context Gathering

Ask the user these questions (you may skip ones you can infer from context):

1. **What project is this MCP server for?**
   - If already in a project directory, offer to analyze it
   - If they reference a project, navigate to it

2. **What should this MCP server be named?**
   - Suggest: `<project-name>-mcp` as default

3. **Where should the MCP server code live?**
   - Same repo (e.g., `mcp-server/` subdirectory) — common for monorepos
   - Separate directory — common for standalone servers

### Step 2: Project Discovery

If working with an existing project, run a discovery analysis following the Discovery Agent instructions (`agents/discovery.md`):

1. Scan the project structure, dependencies, and tech stack
2. Identify API routes, database models, services, and configuration
3. Classify findings into tools, resources, and prompts
4. Present the discovery results to the user

If this is a greenfield MCP server (no existing project), skip to Step 3.

### Step 3: Design Interview

Based on discovery results (or from scratch), resolve these architecture decisions:

**Transport:**
> Will this server be used with Claude Desktop (stdio) or over the network (Streamable HTTP)?
- Default to stdio unless they explicitly need network access
- If Streamable HTTP: note that auth, rate limiting, and DNS rebinding protection are mandatory

**Tools:**
> Here are the tools I recommend based on the project analysis: [list from discovery]
> Which would you like to include? Any to add or remove?
- For each tool, confirm: name, description, input parameters
- Flag any tools that are destructive (delete, modify) — note they need extra care

**Resources:**
> These data sources could be useful as MCP resources: [list from discovery]
> Which should be included?

**External Dependencies:**
> This server will need access to: [list from discovery]
> How are credentials provided? (env vars is the default)
- For each external service, design initialization and cleanup

**Security:**
> Based on the tools selected, here are my security recommendations:
- [List specific recommendations per tool]
> Any additional security requirements?

### Step 4: Generate the Server

Create the MCP server project. Generate these files:

#### 4a. Project structure
```
<target-dir>/
├── src/
│   ├── index.ts          # Server entry point
│   ├── tools/            # Tool handlers (one file per tool)
│   │   └── <name>.ts
│   ├── resources/        # Resource handlers
│   │   └── <name>.ts
│   └── prompts/          # Prompt handlers
│       └── <name>.ts
├── tests/
│   ├── tools/
│   │   └── <name>.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
├── .gitignore
└── CLAUDE.md
```

#### 4b. Server entry point (`src/index.ts`)

Generate using `@modelcontextprotocol/sdk` patterns (see `templates/server-entry.ts.hbs` for reference). The entry point should:
- Create `McpServer` with name and version
- Import and register all tools via `server.registerTool()` with Zod schemas
- Import and register resources via `server.registerResource()` (with `ResourceTemplate` for parameterized URIs)
- Import and register prompts via `server.registerPrompt()`
- Initialize external service clients at module scope with cleanup on SIGTERM
- Connect to `StdioServerTransport` (default) or `NodeStreamableHTTPServerTransport` (network)

#### 4c. Tool files

For each tool, generate a file (see `templates/tool.ts.hbs` for reference):
- Zod schema with `.describe()` on every field and proper constraints (max lengths, ranges)
- Typed handler function returning `CallToolResult` with `content[]`
- Structured logging via `ctx.mcpReq.log()`
- Error handling returning `{ content: [...], isError: true }` for user-facing errors
- Export schema and handler separately for testing

#### 4d. Test files

For each tool, generate a test file using `templates/test-tool.ts.hbs`:
- Happy path test
- Input validation test (wrong types, missing required)
- Edge case tests
- Mock DI providers for external dependencies

#### 4e. Integration test

Generate `tests/integration.test.ts`:
- Server initialization test
- Tool listing test
- Resource listing test
- Full lifecycle test

#### 4f. Configuration files

- `package.json` with `@modelcontextprotocol/sdk` and `zod` dependencies, build/test/dev scripts
- `tsconfig.json` with strict mode, ESM, Node 20+ target
- `.gitignore` with node_modules, dist, .env
- `CLAUDE.md` describing the generated server, its tools, and how to extend it

### Step 5: Security Review

After generating all code, run a security review following the Security Agent instructions (`agents/security.md`):

1. Check all tool schemas for validation completeness
2. Check handlers for injection vulnerabilities
3. Check transport security (auth, rate limiting)
4. Check error handling for information leakage
5. Report any findings and fix them immediately

### Step 6: Verification

1. Run `npm install` in the generated project
2. Run `npm run build` to verify TypeScript compilation
3. Run `npm test` to verify all tests pass
4. Report results to the user

### Step 7: Next Steps

Tell the user:
> Your MCP server is ready. Here's what you can do next:
>
> - **Add more tools**: `/mcp-add-tool`
> - **Add resources**: `/mcp-add-resource`
> - **Run security audit**: `/mcp-audit`
> - **Generate more tests**: `/mcp-test`
> - **Set up deployment**: `/mcp-deploy`
>
> To use with Claude Desktop, add to your config:
> ```json
> {
>   "mcpServers": {
>     "<name>": {
>       "command": "node",
>       "args": ["<path>/dist/index.js"]
>     }
>   }
> }
> ```

## Key Principles

- **Ask, don't assume.** When in doubt about what to expose, ask the user.
- **Secure by default.** Include validation, timeouts, and error handling in every generated tool.
- **Test everything.** Every tool gets a test file. The server gets an integration test.
- **Document for AI.** Tool descriptions and parameter descriptions should be clear enough for an AI model to use correctly without additional context.
