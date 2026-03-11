import type {
  JsonRpcRequest,
  JsonRpcResponse,
  ToolResult,
} from "../types.js";
import { Server } from "../server.js";
import type { ServerBuilder } from "../builder.js";

/**
 * Test harness for MCP servers. Sends JSON-RPC messages directly
 * without needing a transport layer.
 */
export class TestHarness {
  private server: Server;
  private idCounter = 0;

  constructor(builder: ServerBuilder) {
    this.server = builder.build();
  }

  /**
   * Initialize the test server (starts DI container, skips transport).
   */
  async setup(): Promise<void> {
    await this.server.container.initializeAll();
  }

  /**
   * Clean up resources.
   */
  async teardown(): Promise<void> {
    await this.server.container.dispose();
  }

  /**
   * Send a raw JSON-RPC request to the server.
   */
  async send(
    method: string,
    params?: Record<string, unknown>
  ): Promise<JsonRpcResponse> {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: ++this.idCounter,
      method,
      params,
    };

    // Access the private handleRequest method for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.server as any).handleRequest(request);
  }

  /**
   * Call a tool and return the result.
   */
  async callTool(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<ToolResult> {
    const response = await this.send("tools/call", {
      name,
      arguments: args,
    });

    if (response.error) {
      throw new Error(
        `Tool call failed: ${response.error.message} (code: ${response.error.code})`
      );
    }

    return response.result as ToolResult;
  }

  /**
   * List all registered tools.
   */
  async listTools(): Promise<
    Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>
  > {
    const response = await this.send("tools/list");
    return (response.result as { tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> }).tools;
  }

  /**
   * Read a resource by URI.
   */
  async readResource(uri: string) {
    const response = await this.send("resources/read", { uri });
    if (response.error) {
      throw new Error(
        `Resource read failed: ${response.error.message}`
      );
    }
    return response.result;
  }

  /**
   * Get a prompt by name.
   */
  async getPrompt(
    name: string,
    args?: Record<string, string>
  ) {
    const response = await this.send("prompts/get", {
      name,
      arguments: args,
    });
    if (response.error) {
      throw new Error(
        `Prompt get failed: ${response.error.message}`
      );
    }
    return response.result;
  }

  /**
   * Assert that a tool returns text matching the expected value.
   */
  async assertToolReturns(
    name: string,
    args: Record<string, unknown>,
    expected: string | RegExp
  ): Promise<void> {
    const result = await this.callTool(name, args);
    const textContent = result.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error(`Tool "${name}" did not return text content`);
    }
    if (typeof expected === "string") {
      if (textContent.text !== expected) {
        throw new Error(
          `Expected "${expected}", got "${textContent.text}"`
        );
      }
    } else {
      if (!expected.test(textContent.text)) {
        throw new Error(
          `Expected match ${expected}, got "${textContent.text}"`
        );
      }
    }
  }
}

/**
 * Create a test harness from a server builder.
 */
export function createTestHarness(builder: ServerBuilder): TestHarness {
  return new TestHarness(builder);
}

export { createServer, type ServerBuilder } from "../builder.js";
