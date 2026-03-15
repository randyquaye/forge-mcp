---
name: mcp-discover
description: Analyze a project to recommend what to expose via MCP
tags: [mcp, discover, analysis]
allowed-tools: ["Bash", "Glob", "Grep", "Read", "Agent"]
---

# /mcp-discover — Project Discovery for MCP

Analyze the current project (or a specified project) to determine what should be exposed via an MCP server. This skill produces a structured recommendation of tools, resources, and prompts.

## Instructions

You are conducting a thorough analysis of a codebase to recommend MCP capabilities. Follow these steps precisely.

### Step 1: Identify the Target Project

Ask the user:
> What project should I analyze for MCP server design? I can analyze the current directory, or you can point me to a different path.

If the user specifies a path, use that. Otherwise, use the current working directory.

### Step 2: Project Structure Scan

Read the project's top-level structure and key configuration files:
1. List the directory tree (top 3 levels)
2. Read `package.json` (or equivalent for non-Node projects) to understand dependencies and scripts
3. Read any config files (tsconfig, prisma schema, docker-compose, etc.)
4. Identify the tech stack: framework (Express, Fastify, Next.js, etc.), database (Postgres, MongoDB, etc.), ORM (Prisma, Drizzle, etc.)

### Step 3: Deep Analysis

Follow the checklist from the Discovery Agent (`agents/discovery.md`):

1. **Project Documentation** *(do this first)*: Scan for existing docs before analyzing code. Search for:
   - `README.md`, `CONTRIBUTING.md`, and any `.md` files at the root
   - `docs/`, `documentation/`, `wiki/`, `api-docs/`, `guides/` directories
   - OpenAPI/Swagger specs (`.yaml`/`.json` files with `openapi:` or `swagger:` keys)
   - JSDoc/TSDoc comments on public functions in `src/`, `lib/`

   Read any docs found. Extract domain terminology, entity relationships, API usage patterns, multi-step workflows, constraints, and error scenarios. This context is essential for writing good tool descriptions later.

2. **API Routes**: Search for HTTP route definitions across the codebase. Use Grep for patterns like `app.get`, `app.post`, `router.`, `@Get(`, `@Post(`, `server.route`, and file paths like `api/`, `routes/`.

3. **Database Models**: Search for schema/model definitions. Look for Prisma `model`, Drizzle `table()`, TypeORM `@Entity`, Mongoose `Schema`, or raw SQL migrations.

4. **Service Layer**: Search for files in `services/`, `lib/`, `utils/` or classes ending in `Service`, `Manager`, `Repository`.

5. **CLI Commands**: Search for commander/yargs command definitions, or bin entries in package.json.

6. **Configuration**: Identify .env variables (keys only), config files, constants.

### Step 4: Classify Discoveries

For each discovered capability, classify it:

- **TOOL**: If it creates, modifies, deletes, searches, queries, or triggers side effects
- **RESOURCE**: If it provides read-only data, configuration, or state
- **PROMPT**: If it represents a common workflow or interaction pattern

Apply these filters:
- **EXCLUDE** internal implementation details (private methods, utility functions)
- **EXCLUDE** raw database access (always wrap in safe, parameterized handlers)
- **EXCLUDE** anything that would expose credentials or secrets
- **MERGE** CRUD operations into clear, atomic tools (don't expose `UPDATE users SET ...` directly)

### Step 5: Present Findings

Present a structured table to the user:

```
## Discovery Results for [project-name]

### Tech Stack
- Runtime: Node.js / TypeScript
- Framework: [Express/Fastify/etc.]
- Database: [PostgreSQL/MongoDB/etc.]
- ORM: [Prisma/Drizzle/etc.]

### Documentation Found
| Type | Location | Summary |
|------|----------|---------|
| api-reference | docs/api/openapi.yaml | REST API spec — N endpoints covering [entities] |
| guide | docs/guides/auth.md | Auth flow walkthrough, token refresh patterns |
| conceptual | README.md | Architecture overview, entity relationships |
| inline | src/services/*.ts | JSDoc on key service methods |

Key domain context extracted:
- [Domain terms and their meanings]
- [Multi-step workflows described in docs]
- [Constraints, rate limits, or gotchas]

> This documentation will be used to write rich tool descriptions during server generation.
> If no docs were found, note: "No project documentation found. Tool descriptions will be based on code analysis only. Consider adding docs to improve AI agent experience."

### Recommended Tools (N found)
| # | Name | Description | Source File | Inputs | DI Needed |
|---|------|-------------|------------|--------|-----------|
| 1 | search-users | Search users by name/email | routes/users.ts | query, limit? | db |

### Recommended Resources (N found)
| # | URI Pattern | Name | Source File | Type |
|---|-------------|------|------------|------|
| 1 | users://{id} | User Profile | models/user.ts | template |

### Recommended Prompts (N found)
| # | Name | Description | Combines |
|---|------|-------------|----------|
| 1 | debug-issue | Diagnose app issues | logs + config + recent errors |

### Required Providers
| Key | Type | Initialization | Disposal |
|-----|------|---------------|----------|
| db | Connection Pool | createPool(DATABASE_URL) | pool.end() |

### Security Notes
- [Any sensitive operations found]
- [Any data that should NOT be exposed]
- [Required auth considerations]
```

### Step 6: Offer Next Steps

After presenting findings, ask:
> Would you like me to:
> 1. Generate an MCP server with these recommendations? (runs /mcp-init)
> 2. Adjust the recommendations first?
> 3. Deep-dive into a specific area?

If the user chooses option 1, invoke `/mcp-init` with the discovery results as context.
