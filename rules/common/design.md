---
name: mcp-design
description: Design principles for MCP server tool, resource, and prompt definitions
---

# MCP Design Rules

## Tool Design
- **One tool, one job.** Prefer `search-users` + `get-user` over `manage-users`.
- **Tools are actions.** They create, modify, delete, search, query, or trigger side effects.
- **Descriptions are for AI — and informed by project docs.** Write tool descriptions as if explaining to a language model what the tool does, when to use it, what each parameter means, and what it returns. Before writing any description, read the project's existing documentation (README, API docs, guides, OpenAPI specs, JSDoc). Use what you find to include: domain-specific terminology, when to use this tool vs alternatives, related tools and typical workflows, common error scenarios, and any constraints or gotchas. A description that says "Search users by name or email. Returns up to {limit} matching records with id, name, email, and role. Use before create-user to check for duplicates. For bulk lookups, prefer list-users with the ids parameter." is far more useful than "Search users."
- **Atomic over composite.** Small, focused tools compose better than large multi-purpose ones.
- **Destructive tools need safeguards.** Tools that delete or modify data should require confirmation parameters, have audit logging, and be clearly marked in descriptions.

## Resource Design
- **Resources are read-only data.** Configuration, state, profiles, documents.
- **Use natural URIs.** `users://{id}`, `config://app`, `docs://readme`.
- **Set MIME types.** Always specify `mimeType` for resources.
- **Bound the data.** Resources should not return unbounded result sets. Paginate or limit.

## Prompt Design
- **Prompts are reusable patterns.** Common workflows, analysis templates, interaction starters.
- **Arguments via Zod.** Use `argsSchema` with `.describe()` on every field.
- **Return structured messages.** Role must be "user" or "assistant". Content must have a type.

## Naming Conventions
- Tool names: lowercase, hyphenated (`search-users`, `create-order`)
- Resource URIs: scheme describes domain (`users://`, `config://`, `docs://`)
- Prompt names: lowercase, hyphenated, action-oriented (`review-code`, `summarize-data`)

## Architecture
- **Stdio for local.** Use `StdioServerTransport` for Claude Desktop and local CLI tools.
- **Streamable HTTP for network.** Use `NodeStreamableHTTPServerTransport` for services.
- **Module-scoped singletons.** Initialize DB pools, API clients at module scope. Not per-request.
- **Clean shutdown.** Handle SIGTERM/SIGINT. Close connections. Drain in-flight requests.
