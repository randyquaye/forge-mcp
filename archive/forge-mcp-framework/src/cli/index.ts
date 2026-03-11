#!/usr/bin/env node

import { resolve, join } from "node:path";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const command = args[0];

function main(): void {
  switch (command) {
    case "init":
    case "create":
      createProject(args[1]);
      break;
    case "add:tool":
      addTool(args[1]);
      break;
    case "add:resource":
      addResource(args[1]);
      break;
    case "add:prompt":
      addPrompt(args[1]);
      break;
    case "--help":
    case "-h":
    case undefined:
      showHelp();
      break;
    case "--version":
    case "-v":
      console.log("forge-mcp v0.1.0");
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
forge-mcp — Enterprise MCP Server Framework

Usage:
  forge-mcp init <project-name>    Create a new MCP server project
  forge-mcp add:tool <name>        Add a new tool to the project
  forge-mcp add:resource <name>    Add a new resource to the project
  forge-mcp add:prompt <name>      Add a new prompt to the project
  forge-mcp --version              Show version
  forge-mcp --help                 Show this help

Examples:
  forge-mcp init my-mcp-server
  forge-mcp add:tool search-docs
  forge-mcp add:resource config://settings
`);
}

function createProject(name?: string): void {
  if (!name) {
    console.error("Error: Project name required. Usage: forge-mcp init <name>");
    process.exit(1);
  }

  const dir = resolve(process.cwd(), name);
  if (existsSync(dir)) {
    console.error(`Error: Directory "${name}" already exists`);
    process.exit(1);
  }

  console.log(`Creating MCP server: ${name}`);

  // Create directory structure
  const dirs = [
    "",
    "src",
    "src/tools",
    "src/resources",
    "src/prompts",
    "src/middleware",
    "tests",
  ];

  for (const d of dirs) {
    mkdirSync(join(dir, d), { recursive: true });
  }

  // package.json
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name,
        version: "0.1.0",
        type: "module",
        main: "./dist/index.js",
        scripts: {
          build: "tsup src/index.ts --format esm --dts",
          dev: "tsup src/index.ts --format esm --watch --onSuccess 'node dist/index.js'",
          start: "node dist/index.js",
          test: "vitest run",
          "test:watch": "vitest",
          typecheck: "tsc --noEmit",
        },
        dependencies: {
          "forge-mcp": "^0.1.0",
          zod: "^3.23.0",
        },
        devDependencies: {
          "@types/node": "^22.0.0",
          tsup: "^8.0.0",
          typescript: "^5.5.0",
          vitest: "^2.0.0",
        },
      },
      null,
      2
    )
  );

  // tsconfig.json
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          lib: ["ES2022"],
          outDir: "./dist",
          rootDir: "./src",
          declaration: true,
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          isolatedModules: true,
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2
    )
  );

  // Main server file
  writeFileSync(
    join(dir, "src/index.ts"),
    `import { createServer, text } from "forge-mcp";
import { z } from "zod";

const server = createServer({
  name: "${name}",
  version: "0.1.0",
})
  .tool(
    "hello",
    "Say hello to someone",
    z.object({
      name: z.string().describe("The name to greet"),
    }),
    async ({ name }) => {
      return text(\`Hello, \${name}! Welcome to ${name}.\`);
    }
  )
  .build();

server.start();
`
  );

  // Example tool
  writeFileSync(
    join(dir, "src/tools/example.ts"),
    `import { z } from "zod";
import type { ToolHandler } from "forge-mcp";
import { text } from "forge-mcp";

export const echoSchema = z.object({
  message: z.string().describe("Message to echo back"),
});

export const echoHandler: ToolHandler<z.infer<typeof echoSchema>> = async (
  { message },
  context
) => {
  context.logger.info("Echoing message", { message });
  return text(message);
};
`
  );

  // Example test
  writeFileSync(
    join(dir, "tests/hello.test.ts"),
    `import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, createTestHarness, text } from "forge-mcp/testing";
import { z } from "zod";

const builder = createServer({
  name: "test-server",
  version: "0.1.0",
}).tool(
  "hello",
  "Say hello",
  z.object({ name: z.string() }),
  async ({ name }) => text(\`Hello, \${name}!\`)
);

const harness = createTestHarness(builder);

describe("hello tool", () => {
  beforeAll(() => harness.setup());
  afterAll(() => harness.teardown());

  it("greets the user", async () => {
    const result = await harness.callTool("hello", { name: "World" });
    expect(result.content[0]).toEqual({
      type: "text",
      text: "Hello, World!",
    });
  });

  it("lists tools", async () => {
    const tools = await harness.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("hello");
  });
});
`
  );

  // .gitignore
  writeFileSync(
    join(dir, ".gitignore"),
    `node_modules/
dist/
*.tsbuildinfo
.env
.env.local
`
  );

  // CLAUDE.md for the generated project
  writeFileSync(
    join(dir, "CLAUDE.md"),
    `# ${name}

MCP server built with forge-mcp.

## Commands
- \`npm run build\` — Build the server
- \`npm run dev\` — Development mode with auto-reload
- \`npm start\` — Run the built server
- \`npm test\` — Run tests

## Structure
- \`src/index.ts\` — Server entry point with tool/resource/prompt registration
- \`src/tools/\` — Tool implementations
- \`src/resources/\` — Resource providers
- \`src/prompts/\` — Prompt templates
- \`tests/\` — Test files

## Adding capabilities
- \`forge-mcp add:tool <name>\` — Scaffold a new tool
- \`forge-mcp add:resource <name>\` — Scaffold a new resource
- \`forge-mcp add:prompt <name>\` — Scaffold a new prompt
`
  );

  console.log(`
  Project created at ./${name}

  Next steps:
    cd ${name}
    npm install
    npm run dev

  Add more capabilities:
    forge-mcp add:tool search-docs
    forge-mcp add:resource config://settings
`);
}

function addTool(name?: string): void {
  if (!name) {
    console.error("Error: Tool name required");
    process.exit(1);
  }

  const toolsDir = resolve(process.cwd(), "src/tools");
  if (!existsSync(toolsDir)) {
    mkdirSync(toolsDir, { recursive: true });
  }

  const fileName = `${name}.ts`;
  const filePath = join(toolsDir, fileName);

  if (existsSync(filePath)) {
    console.error(`Error: Tool file already exists: ${filePath}`);
    process.exit(1);
  }

  const camelName = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

  writeFileSync(
    filePath,
    `import { z } from "zod";
import type { ToolHandler } from "forge-mcp";
import { text } from "forge-mcp";

export const ${camelName}Schema = z.object({
  // Define your input schema here
  query: z.string().describe("Input query"),
});

export const ${camelName}Handler: ToolHandler<z.infer<typeof ${camelName}Schema>> = async (
  input,
  context
) => {
  context.logger.info("${name} called", { input });

  // Implement your tool logic here

  return text("Tool result");
};
`
  );

  console.log(`Created tool: src/tools/${fileName}`);
  console.log(`\nRegister it in src/index.ts:`);
  console.log(`  import { ${camelName}Schema, ${camelName}Handler } from "./tools/${name}.js";`);
  console.log(`  .tool("${name}", "Description", ${camelName}Schema, ${camelName}Handler)`);
}

function addResource(name?: string): void {
  if (!name) {
    console.error("Error: Resource name required");
    process.exit(1);
  }

  const resourcesDir = resolve(process.cwd(), "src/resources");
  if (!existsSync(resourcesDir)) {
    mkdirSync(resourcesDir, { recursive: true });
  }

  const safeName = name.replace(/[^a-zA-Z0-9-]/g, "-");
  const fileName = `${safeName}.ts`;
  const filePath = join(resourcesDir, fileName);

  writeFileSync(
    filePath,
    `import type { ResourceHandler } from "forge-mcp";

export const ${safeName.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())}Handler: ResourceHandler = async (uri, context) => {
  context.logger.info("Reading resource", { uri });

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify({ example: "data" }),
      },
    ],
  };
};
`
  );

  console.log(`Created resource: src/resources/${fileName}`);
}

function addPrompt(name?: string): void {
  if (!name) {
    console.error("Error: Prompt name required");
    process.exit(1);
  }

  const promptsDir = resolve(process.cwd(), "src/prompts");
  if (!existsSync(promptsDir)) {
    mkdirSync(promptsDir, { recursive: true });
  }

  const fileName = `${name}.ts`;
  const filePath = join(promptsDir, fileName);

  const camelName = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

  writeFileSync(
    filePath,
    `import { z } from "zod";
import type { PromptHandler } from "forge-mcp";

export const ${camelName}Args = z.object({
  topic: z.string().describe("The topic for the prompt"),
});

export const ${camelName}Handler: PromptHandler<z.infer<typeof ${camelName}Args>> = async (
  args,
  _context
) => {
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: \`Please help me with: \${args.topic}\`,
        },
      },
    ],
  };
};
`
  );

  console.log(`Created prompt: src/prompts/${fileName}`);
}

main();
