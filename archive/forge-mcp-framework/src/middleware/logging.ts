import type { ServerMiddleware, ToolMiddleware } from "../types.js";

/**
 * Logs every JSON-RPC request and response time.
 */
export function requestLogging(): ServerMiddleware {
  return async (request, next) => {
    const start = performance.now();
    const response = await next();
    const duration = Math.round(performance.now() - start);

    // Log to stderr via the response (logger is not accessible here,
    // but the server's handleRequest wraps this)
    process.stderr.write(
      JSON.stringify({
        level: 30,
        time: Date.now(),
        msg: "request",
        method: request.method,
        id: request.id,
        duration,
        error: response.error ? true : undefined,
      }) + "\n"
    );

    return response;
  };
}

/**
 * Logs every tool execution with timing.
 */
export function toolLogging(): ToolMiddleware {
  return async (_input, context, next) => {
    const start = performance.now();
    context.logger.info(`Executing tool: ${context.toolName}`);

    try {
      const result = await next();
      const duration = Math.round(performance.now() - start);
      context.logger.info(`Tool completed`, {
        duration,
        isError: result.isError,
      });
      return result;
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      context.logger.error(`Tool failed`, {
        duration,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}
