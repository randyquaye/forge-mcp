import type { z } from "zod";

// ─── MCP Protocol Types ───────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

// ─── MCP Content Types ────────────────────────────────────────────────

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

export interface EmbeddedResource {
  type: "resource";
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
}

export type ToolContent = TextContent | ImageContent | EmbeddedResource;

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

// ─── Tool Definition ──────────────────────────────────────────────────

export interface ToolDefinition<TInput extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  inputSchema: TInput;
  handler: ToolHandler<z.infer<TInput>>;
  middleware?: ToolMiddleware[];
  tags?: string[];
  timeout?: number;
}

export type ToolHandler<TInput = unknown> = (
  input: TInput,
  context: ToolContext
) => Promise<ToolResult> | ToolResult;

export interface ToolContext {
  toolName: string;
  requestId: string | number;
  signal: AbortSignal;
  logger: Logger;
  getResource: <T>(key: string) => T;
  metadata: Record<string, unknown>;
}

// ─── Middleware ────────────────────────────────────────────────────────

export type ToolMiddleware = (
  input: unknown,
  context: ToolContext,
  next: () => Promise<ToolResult>
) => Promise<ToolResult>;

export type ServerMiddleware = (
  request: JsonRpcRequest,
  next: () => Promise<JsonRpcResponse>
) => Promise<JsonRpcResponse>;

// ─── Resources ────────────────────────────────────────────────────────

export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: ResourceHandler;
}

export type ResourceHandler = (
  uri: string,
  context: ResourceContext
) => Promise<ResourceResult>;

export interface ResourceContext {
  uri: string;
  logger: Logger;
  getResource: <T>(key: string) => T;
}

export interface ResourceResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}

// ─── Resource Templates ───────────────────────────────────────────────

export interface ResourceTemplateDefinition {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: ResourceHandler;
}

// ─── Prompts ──────────────────────────────────────────────────────────

export interface PromptDefinition<TArgs extends z.ZodType = z.ZodType> {
  name: string;
  description?: string;
  argsSchema?: TArgs;
  handler: PromptHandler<z.infer<TArgs>>;
}

export type PromptHandler<TArgs = unknown> = (
  args: TArgs,
  context: PromptContext
) => Promise<PromptResult> | PromptResult;

export interface PromptContext {
  logger: Logger;
  getResource: <T>(key: string) => T;
}

export interface PromptResult {
  description?: string;
  messages: PromptMessage[];
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: TextContent | ImageContent | EmbeddedResource;
}

// ─── Server Configuration ─────────────────────────────────────────────

export interface ServerConfig {
  name: string;
  version: string;
  description?: string;
  transport?: TransportConfig;
  logging?: LoggingConfig;
  security?: SecurityConfig;
  performance?: PerformanceConfig;
}

export interface TransportConfig {
  type: "stdio" | "sse";
  sse?: {
    port: number;
    host?: string;
    path?: string;
    corsOrigins?: string[];
  };
}

export interface LoggingConfig {
  level?: "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent";
  pretty?: boolean;
}

export interface SecurityConfig {
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  maxInputSize?: number;
  auth?: AuthConfig;
}

export interface AuthConfig {
  type: "bearer" | "api-key" | "custom";
  validate: (token: string) => Promise<boolean> | boolean;
}

export interface PerformanceConfig {
  toolTimeout?: number;
  maxConcurrentTools?: number;
}

// ─── Logger ───────────────────────────────────────────────────────────

export interface Logger {
  trace: (msg: string, ...args: unknown[]) => void;
  debug: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
  fatal: (msg: string, ...args: unknown[]) => void;
  child: (bindings: Record<string, unknown>) => Logger;
}

// ─── Lifecycle Hooks ──────────────────────────────────────────────────

export interface LifecycleHooks {
  onStart?: () => Promise<void> | void;
  onStop?: () => Promise<void> | void;
  onError?: (error: Error) => Promise<void> | void;
}

// ─── Provider (DI) ────────────────────────────────────────────────────

export interface Provider<T = unknown> {
  key: string;
  factory: () => Promise<T> | T;
  dispose?: (instance: T) => Promise<void> | void;
}
