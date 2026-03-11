---
name: mcp-deploy
description: Generate deployment configuration for an MCP server
tags: [mcp, deploy, docker, ci]
allowed-tools: ["Bash", "Glob", "Read", "Write"]
---

# /mcp-deploy — Deployment Configuration

Generate deployment artifacts for an MCP server.

## Instructions

### Step 1: Ask Deployment Target

> How do you want to deploy this MCP server?
> 1. **Claude Desktop** — Local stdio server (simplest)
> 2. **Docker** — Container for SSE transport
> 3. **CI/CD** — GitHub Actions pipeline for build/test/publish
> 4. **All of the above**

### Step 2: Generate Artifacts

#### Claude Desktop Config

Generate the JSON snippet for `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "node",
      "args": ["<absolute-path>/dist/index.js"],
      "env": {
        "DATABASE_URL": "your-connection-string"
      }
    }
  }
}
```

Tell the user where to add this:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

#### Dockerfile

Generate using `templates/docker/Dockerfile.hbs` pattern:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
RUN addgroup -g 1001 -S mcp && adduser -S mcp -u 1001
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER mcp
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/mcp/health || exit 1
CMD ["node", "dist/index.js"]
```

Also generate `docker-compose.yml` for local development with any required services (database, etc.).

#### GitHub Actions

Generate `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - run: npm test
```

### Step 3: Environment Variables

List all required environment variables the server needs:
```
# Required
DATABASE_URL=postgresql://...
API_TOKEN=your-token

# Optional
LOG_LEVEL=info
PORT=3000
```

Generate a `.env.example` file with placeholders.

### Step 4: Verify

- If Docker: run `docker build .` to verify
- If Claude Desktop: verify the config JSON is valid
- If CI: verify the workflow YAML is valid

Report what was generated and any manual steps needed.
