import type { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from "../types.js";
import type { Logger } from "../types.js";

export type MessageHandler = (
  message: JsonRpcRequest
) => Promise<JsonRpcResponse>;

/**
 * Stdio transport for MCP. Reads newline-delimited JSON from stdin,
 * writes responses to stdout. Logs go to stderr (never stdout).
 */
export class StdioTransport {
  private buffer = "";
  private handler: MessageHandler | null = null;
  private running = false;

  constructor(private readonly logger: Logger) {}

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk: string) => {
      this.buffer += chunk;
      this.processBuffer();
    });
    process.stdin.on("end", () => {
      this.running = false;
      this.logger.info("Stdin closed, shutting down");
    });
    process.stdin.resume();

    this.logger.debug("Stdio transport started");
  }

  stop(): void {
    this.running = false;
    process.stdin.pause();
  }

  send(message: JsonRpcResponse | JsonRpcNotification): void {
    const data = JSON.stringify(message);
    process.stdout.write(data + "\n");
  }

  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const message = JSON.parse(trimmed) as JsonRpcRequest;
        this.handleMessage(message);
      } catch {
        this.logger.error("Failed to parse message");
        this.send({
          jsonrpc: "2.0",
          id: 0,
          error: {
            code: -32700,
            message: "Parse error",
          },
        });
      }
    }
  }

  private handleMessage(message: JsonRpcRequest): void {
    if (!this.handler) {
      this.logger.warn("No handler registered, dropping message");
      return;
    }

    this.handler(message)
      .then((response) => {
        this.send(response);
      })
      .catch((err: unknown) => {
        this.logger.error("Unhandled error in message handler", {
          error: err instanceof Error ? err.message : String(err),
        });
        this.send({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32603,
            message: "Internal error",
          },
        });
      });
  }
}
