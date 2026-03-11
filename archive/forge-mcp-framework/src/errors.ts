// MCP JSON-RPC error codes
export const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  // Custom MCP error codes
  ToolNotFound: -32001,
  ToolExecutionError: -32002,
  ToolTimeout: -32003,
  ValidationError: -32004,
  ResourceNotFound: -32005,
  PromptNotFound: -32006,
  RateLimited: -32007,
  Unauthorized: -32008,
} as const;

export class McpError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "McpError";
  }

  toJsonRpc() {
    return {
      code: this.code,
      message: this.message,
      ...(this.data !== undefined && { data: this.data }),
    };
  }
}

export class ToolNotFoundError extends McpError {
  constructor(toolName: string) {
    super(ErrorCode.ToolNotFound, `Tool not found: ${toolName}`);
    this.name = "ToolNotFoundError";
  }
}

export class ValidationError extends McpError {
  constructor(message: string, data?: unknown) {
    super(ErrorCode.ValidationError, message, data);
    this.name = "ValidationError";
  }
}

export class ToolExecutionError extends McpError {
  constructor(toolName: string, cause: Error) {
    super(
      ErrorCode.ToolExecutionError,
      `Tool "${toolName}" execution failed: ${cause.message}`,
      { cause: cause.message }
    );
    this.name = "ToolExecutionError";
  }
}

export class ToolTimeoutError extends McpError {
  constructor(toolName: string, timeoutMs: number) {
    super(
      ErrorCode.ToolTimeout,
      `Tool "${toolName}" timed out after ${timeoutMs}ms`
    );
    this.name = "ToolTimeoutError";
  }
}

export class ResourceNotFoundError extends McpError {
  constructor(uri: string) {
    super(ErrorCode.ResourceNotFound, `Resource not found: ${uri}`);
    this.name = "ResourceNotFoundError";
  }
}

export class PromptNotFoundError extends McpError {
  constructor(name: string) {
    super(ErrorCode.PromptNotFound, `Prompt not found: ${name}`);
    this.name = "PromptNotFoundError";
  }
}

export class RateLimitError extends McpError {
  constructor() {
    super(ErrorCode.RateLimited, "Rate limit exceeded");
    this.name = "RateLimitError";
  }
}

export class UnauthorizedError extends McpError {
  constructor(message = "Unauthorized") {
    super(ErrorCode.Unauthorized, message);
    this.name = "UnauthorizedError";
  }
}
