import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { z } from "zod";
import { createServer, text, json, error } from "../src/builder.js";
import { createTestHarness } from "../src/testing/index.js";

const builder = createServer({
  name: "test-server",
  version: "1.0.0",
})
  .tool(
    "greet",
    "Greet someone",
    z.object({
      name: z.string(),
      excited: z.boolean().optional(),
    }),
    async ({ name, excited }) => {
      const greeting = excited ? `HELLO, ${name}!!!` : `Hello, ${name}.`;
      return text(greeting);
    }
  )
  .tool(
    "add",
    "Add two numbers",
    z.object({
      a: z.number(),
      b: z.number(),
    }),
    async ({ a, b }) => json({ result: a + b })
  )
  .tool(
    "fail",
    "Always fails",
    z.object({}),
    async () => error("Something went wrong")
  )
  .resource("config://app", "App Config", async (uri) => ({
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify({ env: "test" }),
      },
    ],
  }))
  .resourceTemplate(
    "users://{userId}",
    "User Profile",
    async (uri) => ({
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ id: uri.split("://")[1], name: "Test User" }),
        },
      ],
    })
  )
  .prompt("summarize", async (args) => ({
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text: `Summarize: ${args.topic}` },
      },
    ],
  }), {
    description: "Summarize a topic",
    argsSchema: z.object({ topic: z.string() }),
  });

const harness = createTestHarness(builder);

describe("MCP Server", () => {
  beforeAll(() => harness.setup());
  afterAll(() => harness.teardown());

  describe("initialize", () => {
    it("returns server info and capabilities", async () => {
      const response = await harness.send("initialize");
      expect(response.result).toMatchObject({
        protocolVersion: "2024-11-05",
        serverInfo: { name: "test-server", version: "1.0.0" },
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      });
    });
  });

  describe("tools/list", () => {
    it("lists all registered tools", async () => {
      const tools = await harness.listTools();
      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name).sort()).toEqual(["add", "fail", "greet"]);
    });

    it("includes JSON Schema for inputs", async () => {
      const tools = await harness.listTools();
      const greet = tools.find((t) => t.name === "greet")!;
      expect(greet.inputSchema).toHaveProperty("type", "object");
      expect(greet.inputSchema).toHaveProperty("properties");
    });
  });

  describe("tools/call", () => {
    it("executes a tool with valid input", async () => {
      const result = await harness.callTool("greet", { name: "World" });
      expect(result.content[0]).toEqual({
        type: "text",
        text: "Hello, World.",
      });
    });

    it("handles optional parameters", async () => {
      const result = await harness.callTool("greet", {
        name: "World",
        excited: true,
      });
      expect(result.content[0]).toEqual({
        type: "text",
        text: "HELLO, World!!!",
      });
    });

    it("returns JSON results", async () => {
      const result = await harness.callTool("add", { a: 2, b: 3 });
      const parsed = JSON.parse(
        (result.content[0] as { type: "text"; text: string }).text
      );
      expect(parsed.result).toBe(5);
    });

    it("returns error results", async () => {
      const result = await harness.callTool("fail", {});
      expect(result.isError).toBe(true);
    });

    it("rejects invalid input", async () => {
      const response = await harness.send("tools/call", {
        name: "greet",
        arguments: { name: 123 },
      });
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32004);
    });

    it("rejects unknown tools", async () => {
      const response = await harness.send("tools/call", {
        name: "nonexistent",
        arguments: {},
      });
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32001);
    });
  });

  describe("resources", () => {
    it("lists static resources", async () => {
      const response = await harness.send("resources/list");
      const resources = (response.result as { resources: Array<{ uri: string }> }).resources;
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe("config://app");
    });

    it("reads a static resource", async () => {
      const result = await harness.readResource("config://app");
      expect(result).toMatchObject({
        contents: [{ uri: "config://app", mimeType: "application/json" }],
      });
    });

    it("reads a templated resource", async () => {
      const result = await harness.readResource("users://42");
      expect(result).toMatchObject({
        contents: [{ uri: "users://42" }],
      });
    });
  });

  describe("prompts", () => {
    it("lists prompts", async () => {
      const response = await harness.send("prompts/list");
      const prompts = (response.result as { prompts: Array<{ name: string }> }).prompts;
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe("summarize");
    });

    it("gets a prompt with args", async () => {
      const result = await harness.getPrompt("summarize", {
        topic: "TypeScript",
      });
      expect(result).toMatchObject({
        messages: [
          {
            role: "user",
            content: { type: "text", text: "Summarize: TypeScript" },
          },
        ],
      });
    });
  });

  describe("error handling", () => {
    it("returns MethodNotFound for unknown methods", async () => {
      const response = await harness.send("unknown/method");
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32601);
    });
  });
});
