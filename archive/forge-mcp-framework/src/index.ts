// ─── Core ─────────────────────────────────────────────────────────────
export { Server } from "./server.js";
export { createServer, ServerBuilder, text, json, error, content, image } from "./builder.js";
export { Registry } from "./registry.js";
export { Container } from "./container.js";
export { Executor } from "./executor.js";

// ─── Types ────────────────────────────────────────────────────────────
export type {
  // Protocol
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcNotification,
  // Content
  TextContent,
  ImageContent,
  EmbeddedResource,
  ToolContent,
  ToolResult,
  // Tools
  ToolDefinition,
  ToolHandler,
  ToolContext,
  ToolMiddleware,
  // Server
  ServerConfig,
  ServerMiddleware,
  TransportConfig,
  LoggingConfig,
  SecurityConfig,
  PerformanceConfig,
  // Resources
  ResourceDefinition,
  ResourceHandler,
  ResourceContext,
  ResourceResult,
  ResourceTemplateDefinition,
  // Prompts
  PromptDefinition,
  PromptHandler,
  PromptContext,
  PromptResult,
  PromptMessage,
  // DI
  Provider,
  // Lifecycle
  LifecycleHooks,
  // Logger
  Logger,
} from "./types.js";

// ─── Errors ───────────────────────────────────────────────────────────
export {
  McpError,
  ErrorCode,
  ToolNotFoundError,
  ValidationError,
  ToolExecutionError,
  ToolTimeoutError,
  ResourceNotFoundError,
  PromptNotFoundError,
  RateLimitError,
  UnauthorizedError,
} from "./errors.js";

// ─── Middleware ────────────────────────────────────────────────────────
export {
  rateLimit,
  requestLogging,
  toolLogging,
  bearerAuth,
  apiKeyAuth,
} from "./middleware/index.js";

// ─── Transport ────────────────────────────────────────────────────────
export { StdioTransport } from "./transport/stdio.js";
export { SSETransport } from "./transport/sse.js";

// ─── Logger ───────────────────────────────────────────────────────────
export { createLogger } from "./logger.js";
