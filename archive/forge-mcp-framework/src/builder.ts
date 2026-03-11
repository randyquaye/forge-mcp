import { z } from "zod";
import type {
  ServerConfig,
  ToolHandler,
  ToolMiddleware,
  ServerMiddleware,
  ResourceHandler,
  PromptHandler,
  Provider,
  LifecycleHooks,
  ToolResult,
  TextContent,
} from "./types.js";
import { Server } from "./server.js";

/**
 * Fluent builder API for constructing MCP servers.
 *
 * @example
 * ```ts
 * const server = createServer({
 *   name: "my-server",
 *   version: "1.0.0",
 * })
 *   .tool("greet", "Greet a user", z.object({ name: z.string() }), async ({ name }) => {
 *     return text(`Hello, ${name}!`);
 *   })
 *   .build();
 *
 * await server.start();
 * ```
 */
export class ServerBuilder {
  private server: Server;

  constructor(config: ServerConfig) {
    this.server = new Server(config);
  }

  /**
   * Register a tool with schema validation and handler.
   */
  tool<T extends z.ZodType>(
    name: string,
    description: string,
    inputSchema: T,
    handler: ToolHandler<z.infer<T>>,
    opts?: { middleware?: ToolMiddleware[]; tags?: string[]; timeout?: number }
  ): this {
    this.server.registry.registerTool({
      name,
      description,
      inputSchema,
      handler: handler as ToolHandler,
      middleware: opts?.middleware,
      tags: opts?.tags,
      timeout: opts?.timeout,
    });
    return this;
  }

  /**
   * Register a static resource.
   */
  resource(
    uri: string,
    name: string,
    handler: ResourceHandler,
    opts?: { description?: string; mimeType?: string }
  ): this {
    this.server.registry.registerResource({
      uri,
      name,
      handler,
      description: opts?.description,
      mimeType: opts?.mimeType,
    });
    return this;
  }

  /**
   * Register a resource template (URI with parameters).
   */
  resourceTemplate(
    uriTemplate: string,
    name: string,
    handler: ResourceHandler,
    opts?: { description?: string; mimeType?: string }
  ): this {
    this.server.registry.registerResourceTemplate({
      uriTemplate,
      name,
      handler,
      description: opts?.description,
      mimeType: opts?.mimeType,
    });
    return this;
  }

  /**
   * Register a prompt template.
   */
  prompt<T extends z.ZodType>(
    name: string,
    handler: PromptHandler<z.infer<T>>,
    opts?: { description?: string; argsSchema?: T }
  ): this {
    this.server.registry.registerPrompt({
      name,
      description: opts?.description,
      argsSchema: opts?.argsSchema,
      handler: handler as PromptHandler,
    });
    return this;
  }

  /**
   * Register a dependency (DB pool, API client, etc.).
   */
  provide<T>(provider: Provider<T>): this {
    this.server.container.register(provider);
    return this;
  }

  /**
   * Add server-level middleware (runs on every request).
   */
  use(middleware: ServerMiddleware): this {
    this.server.use(middleware);
    return this;
  }

  /**
   * Add tool-level middleware (runs on every tool call).
   */
  useToolMiddleware(middleware: ToolMiddleware): this {
    this.server.useToolMiddleware(middleware);
    return this;
  }

  /**
   * Register lifecycle hooks.
   */
  onLifecycle(hooks: LifecycleHooks): this {
    this.server.onLifecycle(hooks);
    return this;
  }

  /**
   * Build and return the configured server.
   */
  build(): Server {
    return this.server;
  }
}

/**
 * Create a new MCP server with the fluent builder API.
 */
export function createServer(config: ServerConfig): ServerBuilder {
  return new ServerBuilder(config);
}

// ─── Response Helpers ─────────────────────────────────────────────────

/** Create a text tool result. */
export function text(content: string): ToolResult {
  return {
    content: [{ type: "text", text: content }],
  };
}

/** Create a JSON tool result. */
export function json(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/** Create an error tool result. */
export function error(message: string): ToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

/** Create a tool result with multiple content parts. */
export function content(...parts: TextContent[]): ToolResult {
  return { content: parts };
}

/** Create an image tool result. */
export function image(base64Data: string, mimeType: string): ToolResult {
  return {
    content: [{ type: "image", data: base64Data, mimeType }],
  };
}
