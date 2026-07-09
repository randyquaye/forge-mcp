# forge-mcp

> A Claude Code plugin that turns any Claude agent into an expert MCP server builder.

**forge-mcp** provides guided skills, specialized agents, security/performance hooks, and
code templates that let a Claude agent scaffold **enterprise-grade, production-ready
[Model Context Protocol](https://modelcontextprotocol.io) servers** — from a blank
directory to a tested, deployable server. Every server it generates is **standalone** and
uses the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk);
there is no custom framework runtime dependency — you own all the code.

- **License:** MIT
- **Version:** 0.1.0
- **Category:** workflow / developer tooling
- **Author:** Randy Quaye

---

## Installation

Install as a Claude Code plugin:

```bash
# 1. Add the marketplace
/plugin marketplace add randyquaye/forge-mcp

# 2. Install the plugin
/plugin install forge-mcp@randyquaye-forge-mcp
```

Or run it directly from a local checkout during development:

```bash
claude --plugin-dir /path/to/forge-mcp
```

## Quick start

```bash
# Analyze an existing project and get a recommendation for what to expose over MCP
/forge-mcp:mcp-discover

# Scaffold a new MCP server end-to-end (discovery → interview → code generation)
/forge-mcp:mcp-init

# Add capabilities
/forge-mcp:mcp-add-tool
/forge-mcp:mcp-add-resource
/forge-mcp:mcp-add-prompt

# Verify and ship
/forge-mcp:mcp-audit    # security, performance, correctness review
/forge-mcp:mcp-test     # generate + run comprehensive tests
/forge-mcp:mcp-deploy   # Docker, CI, and Claude Desktop configs
```

## What it does

forge-mcp is not itself an MCP server — it is a **plugin that builds them**. It packages
opinionated MCP expertise into Claude Code primitives:

| Command | Skill | What it produces |
|---------|-------|------------------|
| `/forge-mcp:mcp-discover` | `mcp-discover` | An analysis of a project recommending what to expose as tools/resources/prompts. |
| `/forge-mcp:mcp-init` | `mcp-init` | A full MCP server (guided discovery, user interview, generated code). |
| `/forge-mcp:mcp-add-tool` | `mcp-add-tool` | A new tool with Zod validation, security review, and tests. |
| `/forge-mcp:mcp-add-resource` | `mcp-add-resource` | A resource or resource template. |
| `/forge-mcp:mcp-add-prompt` | `mcp-add-prompt` | A prompt template. |
| `/forge-mcp:mcp-audit` | `mcp-audit` | A security, performance, and correctness audit. |
| `/forge-mcp:mcp-test` | `mcp-test` | Generated and executed test suites. |
| `/forge-mcp:mcp-deploy` | `mcp-deploy` | Deployment configs (Docker, GitHub Actions CI, Claude Desktop). |

## Design philosophy

The plugin enforces a consistent set of MCP design principles across everything it generates:

1. **Tools are actions, resources are data.** Tools let the AI *do* something (create,
   search, modify). Resources let the AI *read* something (config, state, docs). Never
   confuse the two.
2. **One tool, one job.** Prefer `search-users` and `get-user` over `manage-users`. Atomic
   tools compose better and are easier for models to reason about.
3. **Descriptions are for AI consumption.** Tool, parameter, and resource descriptions are
   read by the model to decide what to call — be precise about what it does, what each
   parameter means, what the return contains, and when to use it over alternatives.
4. **Validate everything.** Every tool uses a Zod schema; every field has `.describe()`.
   No `z.any()` / `z.unknown()` in tool inputs.
5. **Fail safely.** External calls get timeouts; expensive tools respect concurrency
   limits; error responses never leak stack traces, connection strings, or paths.
6. **Module-scoped singletons over globals.** Pools, clients, and config are initialized
   once, enabling clean testing and shutdown.

## Security baseline

Non-negotiable rules the plugin holds generated servers to (see [`rules/common/security.md`](rules/common/security.md)):

- **Input validation** — Zod on every tool; constrain string lengths, number ranges, enums. No unbounded inputs.
- **Path safety** — resolve file paths against an allowlist and normalize (reject `..`). No arbitrary filesystem access.
- **Injection prevention** — never build SQL, shell commands, or URLs by string concatenation from user input. Parameterize.
- **Credential protection** — results never include keys, tokens, passwords, or connection strings. Sanitize before returning.
- **Transport auth** — Streamable HTTP transport validates auth tokens and uses DNS-rebinding protection.
- **Rate limiting** — network-exposed servers require rate-limiting middleware.
- **Timeouts** — every external call has a timeout (AbortSignal / `Promise.race` / client config).
- **Error hygiene** — production errors carry no stack traces or internal paths; use `isError: true` for user-facing errors.

## How it's organized

forge-mcp separates concerns across Claude Code primitives, each with a distinct role:

| Component | Role | Answers |
|-----------|------|---------|
| **Commands** (`commands/`) | Quick orchestration entry points | *What to do* |
| **Skills** (`skills/`) | Detailed step-by-step workflows | *How to do it* |
| **Agents** (`agents/`) | Specialized reviewers with their own tools + models | *Who does the work* |
| **Rules** (`rules/`) | Always-on guidelines | *What standards to enforce* |
| **Hooks** (`hooks/`) | Automated triggers on file changes | *When to check* |
| **Templates** (`templates/`) | `@modelcontextprotocol/sdk` code patterns | *What to generate* |

The specialized agents are:

- **discovery** (`sonnet`) — scans a codebase to recommend what to expose.
- **security** (`opus`) — vulnerability reviewer.
- **performance** (`sonnet`) — reliability reviewer.
- **testing** (`sonnet`) — test generator.

Hooks run on `Write`/`Edit`: they remind you to run `/forge-mcp:mcp-audit` after touching
`src/tools/`, prompt a `typecheck` after editing `src/index.ts`, and warn when a tool
schema is missing `.describe()` on its fields.

## Repository layout

```
forge-mcp/
├── .claude-plugin/
│   ├── plugin.json          # Plugin manifest
│   └── marketplace.json     # Distribution catalog
├── commands/                # 8 quick commands (orchestrate agents + skills)
├── skills/                  # 8 deep-reference skills (SKILL.md each)
├── agents/                  # 4 specialized agents (discovery, security, performance, testing)
├── rules/common/            # Always-follow rules (security, design, testing, performance)
├── hooks/hooks.json         # PostToolUse automation
├── templates/               # Handlebars codegen templates (server, tool, resource,
│                            #   prompt, tests, middleware, Docker, CI)
├── archive/                 # Archived early framework prototype (reference only)
└── CLAUDE.md                # In-repo agent guidance / design reference
```

> **`archive/forge-mcp-framework/`** holds an earlier iteration — a from-scratch TypeScript
> MCP framework (fluent builder, DI container, middleware, transports, test harness, CLI).
> It was archived when the project pivoted to being a *plugin* that generates standalone
> servers on the official SDK. Kept as reference; its patterns informed the current
> templates and agent guidance.

## Generated server dependencies

Servers created by this plugin depend only on:

- [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) — the official MCP SDK (server + transports)
- [`zod`](https://zod.dev) — input validation and schema generation

No custom framework — the generated server is fully standalone and yours to own.

## License

[MIT](LICENSE) © Randy Quaye
