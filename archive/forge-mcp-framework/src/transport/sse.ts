import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { JsonRpcRequest, JsonRpcResponse, Logger } from "../types.js";

export type MessageHandler = (
  message: JsonRpcRequest
) => Promise<JsonRpcResponse>;

interface SSEClient {
  id: string;
  response: ServerResponse;
}

/**
 * SSE (Server-Sent Events) transport for MCP.
 * Exposes HTTP endpoints for SSE connection and JSON-RPC message posting.
 */
export class SSETransport {
  private handler: MessageHandler | null = null;
  private server: ReturnType<typeof createServer> | null = null;
  private clients = new Map<string, SSEClient>();
  private clientCounter = 0;

  constructor(
    private readonly logger: Logger,
    private readonly config: {
      port: number;
      host?: string;
      path?: string;
      corsOrigins?: string[];
    }
  ) {}

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    const basePath = this.config.path ?? "/mcp";

    this.server = createServer((req, res) => {
      // CORS
      if (this.config.corsOrigins?.length) {
        const origin = req.headers.origin ?? "";
        if (
          this.config.corsOrigins.includes("*") ||
          this.config.corsOrigins.includes(origin)
        ) {
          res.setHeader("Access-Control-Allow-Origin", origin || "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        }
        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }
      }

      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

      if (url.pathname === `${basePath}/sse` && req.method === "GET") {
        this.handleSSEConnect(req, res);
      } else if (
        url.pathname === `${basePath}/message` &&
        req.method === "POST"
      ) {
        this.handleMessage(req, res);
      } else if (url.pathname === `${basePath}/health` && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", clients: this.clients.size }));
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    return new Promise((resolve) => {
      this.server!.listen(
        this.config.port,
        this.config.host ?? "127.0.0.1",
        () => {
          this.logger.info(
            `SSE transport listening on ${this.config.host ?? "127.0.0.1"}:${this.config.port}${basePath}`
          );
          resolve();
        }
      );
    });
  }

  async stop(): Promise<void> {
    // Close all SSE connections
    for (const client of this.clients.values()) {
      client.response.end();
    }
    this.clients.clear();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private handleSSEConnect(_req: IncomingMessage, res: ServerResponse): void {
    const clientId = `client_${++this.clientCounter}`;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send endpoint info
    res.write(
      `event: endpoint\ndata: ${JSON.stringify({ url: `${this.config.path ?? "/mcp"}/message` })}\n\n`
    );

    this.clients.set(clientId, { id: clientId, response: res });
    this.logger.debug("SSE client connected", { clientId });

    _req.on("close", () => {
      this.clients.delete(clientId);
      this.logger.debug("SSE client disconnected", { clientId });
    });
  }

  private handleMessage(req: IncomingMessage, res: ServerResponse): void {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const message = JSON.parse(body) as JsonRpcRequest;

        if (!this.handler) {
          res.writeHead(503);
          res.end("Server not ready");
          return;
        }

        this.handler(message)
          .then((response) => {
            // Send response via SSE to all connected clients
            for (const client of this.clients.values()) {
              client.response.write(
                `event: message\ndata: ${JSON.stringify(response)}\n\n`
              );
            }
            res.writeHead(202, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "accepted" }));
          })
          .catch((err: unknown) => {
            this.logger.error("Handler error", {
              error: err instanceof Error ? err.message : String(err),
            });
            res.writeHead(500);
            res.end("Internal error");
          });
      } catch {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
    });
  }
}
