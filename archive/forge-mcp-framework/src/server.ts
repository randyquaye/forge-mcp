import type {
  JsonRpcRequest,
  JsonRpcResponse,
  ServerConfig,
  ToolMiddleware,
  ServerMiddleware,
  LifecycleHooks,
  Logger,
} from "./types.js";
import { Registry } from "./registry.js";
import { Container } from "./container.js";
import { Executor } from "./executor.js";
import { StdioTransport } from "./transport/stdio.js";
import { SSETransport } from "./transport/sse.js";
import { createLogger } from "./logger.js";
import {
  McpError,
  ErrorCode,
  ToolNotFoundError,
  ResourceNotFoundError,
  PromptNotFoundError,
} from "./errors.js";

const MCP_PROTOCOL_VERSION = "2024-11-05";

export class Server {
  readonly registry: Registry;
  readonly container: Container;
  readonly logger: Logger;
  private executor: Executor;
  private transport: StdioTransport | SSETransport | null = null;
  private serverMiddleware: ServerMiddleware[] = [];
  private toolMiddleware: ToolMiddleware[] = [];
  private hooks: LifecycleHooks = {};
  private running = false;

  constructor(private readonly config: ServerConfig) {
    this.registry = new Registry();
    this.container = new Container();
    this.logger = createLogger({
      level: config.logging?.level,
      pretty: config.logging?.pretty,
      name: config.name,
    });
    this.executor = new Executor(
      this.container,
      this.logger,
      config.performance?.maxConcurrentTools,
      config.performance?.toolTimeout
    );
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.running) return;

    this.logger.info(`Starting ${this.config.name} v${this.config.version}`);

    // Initialize DI container
    await this.container.initializeAll();

    // Create transport
    const transportType = this.config.transport?.type ?? "stdio";
    if (transportType === "sse" && this.config.transport?.sse) {
      this.transport = new SSETransport(this.logger, this.config.transport.sse);
    } else {
      this.transport = new StdioTransport(this.logger);
    }

    this.transport.onMessage((msg) => this.handleRequest(msg));

    if (this.transport instanceof SSETransport) {
      await this.transport.start();
    } else {
      this.transport.start();
    }

    // Lifecycle hook
    await this.hooks.onStart?.();

    this.running = true;

    // Graceful shutdown
    const shutdown = async () => {
      await this.stop();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    this.logger.info("Server started", {
      transport: transportType,
      tools: this.registry.listTools().length,
      resources: this.registry.listResources().length,
      prompts: this.registry.listPrompts().length,
    });
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    this.logger.info("Shutting down...");

    if (this.transport instanceof SSETransport) {
      await this.transport.stop();
    } else if (this.transport instanceof StdioTransport) {
      this.transport.stop();
    }

    await this.hooks.onStop?.();
    await this.container.dispose();

    this.logger.info("Server stopped");
  }

  // ─── Configuration ──────────────────────────────────────────────────

  use(middleware: ServerMiddleware): void {
    this.serverMiddleware.push(middleware);
  }

  useToolMiddleware(middleware: ToolMiddleware): void {
    this.toolMiddleware.push(middleware);
  }

  onLifecycle(hooks: LifecycleHooks): void {
    this.hooks = { ...this.hooks, ...hooks };
  }

  // ─── Request Handling ───────────────────────────────────────────────

  private async handleRequest(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    // Build server middleware chain
    const handler = async (): Promise<JsonRpcResponse> => {
      try {
        const result = await this.dispatch(request);
        return {
          jsonrpc: "2.0",
          id: request.id,
          result,
        };
      } catch (err) {
        if (err instanceof McpError) {
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: err.toJsonRpc(),
          };
        }
        this.logger.error("Unhandled error", {
          error: err instanceof Error ? err.message : String(err),
          method: request.method,
        });
        await this.hooks.onError?.(
          err instanceof Error ? err : new Error(String(err))
        );
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: ErrorCode.InternalError,
            message: "Internal error",
          },
        };
      }
    };

    // Apply server middleware (outermost first)
    const chain = this.serverMiddleware.reduceRight<
      () => Promise<JsonRpcResponse>
    >((next, mw) => () => mw(request, next), handler);

    try {
      return await chain();
    } catch (err) {
      if (err instanceof McpError) {
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: err.toJsonRpc(),
        };
      }
      this.logger.error("Unhandled middleware error", {
        error: err instanceof Error ? err.message : String(err),
        method: request.method,
      });
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: ErrorCode.InternalError,
          message: "Internal error",
        },
      };
    }
  }

  private async dispatch(request: JsonRpcRequest): Promise<unknown> {
    switch (request.method) {
      case "initialize":
        return this.handleInitialize();

      case "notifications/initialized":
        return {};

      case "ping":
        return {};

      case "tools/list":
        return { tools: this.registry.listTools() };

      case "tools/call":
        return this.handleToolCall(request);

      case "resources/list":
        return { resources: this.registry.listResources() };

      case "resources/templates/list":
        return {
          resourceTemplates: this.registry.listResourceTemplates(),
        };

      case "resources/read":
        return this.handleResourceRead(request);

      case "prompts/list":
        return { prompts: this.registry.listPrompts() };

      case "prompts/get":
        return this.handlePromptGet(request);

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown method: ${request.method}`
        );
    }
  }

  private handleInitialize() {
    return {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: this.registry.listTools().length > 0 ? {} : undefined,
        resources:
          this.registry.listResources().length > 0 ||
          this.registry.listResourceTemplates().length > 0
            ? {}
            : undefined,
        prompts:
          this.registry.listPrompts().length > 0 ? {} : undefined,
      },
      serverInfo: {
        name: this.config.name,
        version: this.config.version,
      },
    };
  }

  private async handleToolCall(request: JsonRpcRequest) {
    const params = request.params as {
      name: string;
      arguments?: Record<string, unknown>;
    };

    const tool = this.registry.getTool(params.name);
    if (!tool) {
      throw new ToolNotFoundError(params.name);
    }

    const result = await this.executor.execute(
      tool,
      params.arguments ?? {},
      request.id,
      this.toolMiddleware
    );

    return result;
  }

  private async handleResourceRead(request: JsonRpcRequest) {
    const params = request.params as { uri: string };

    // Try exact match first
    const resource = this.registry.getResource(params.uri);
    if (resource) {
      return resource.handler(params.uri, {
        uri: params.uri,
        logger: this.logger.child({ resource: params.uri }),
        getResource: <T>(key: string) => this.container.getSync<T>(key),
      });
    }

    // Try template match
    const match = this.registry.matchResourceTemplate(params.uri);
    if (match) {
      return match.template.handler(params.uri, {
        uri: params.uri,
        logger: this.logger.child({ resource: params.uri }),
        getResource: <T>(key: string) => this.container.getSync<T>(key),
      });
    }

    throw new ResourceNotFoundError(params.uri);
  }

  private async handlePromptGet(request: JsonRpcRequest) {
    const params = request.params as {
      name: string;
      arguments?: Record<string, string>;
    };

    const prompt = this.registry.getPrompt(params.name);
    if (!prompt) {
      throw new PromptNotFoundError(params.name);
    }

    // Validate args if schema exists
    const args = params.arguments ?? {};
    if (prompt.argsSchema) {
      const parsed = prompt.argsSchema.safeParse(args);
      if (!parsed.success) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid prompt arguments`,
          parsed.error.flatten()
        );
      }
      return prompt.handler(parsed.data, {
        logger: this.logger.child({ prompt: params.name }),
        getResource: <T>(key: string) => this.container.getSync<T>(key),
      });
    }

    return prompt.handler(args, {
      logger: this.logger.child({ prompt: params.name }),
      getResource: <T>(key: string) => this.container.getSync<T>(key),
    });
  }
}
