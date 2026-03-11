import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { z } from "zod";
import { createServer, text } from "../src/builder.js";
import { createTestHarness } from "../src/testing/index.js";
import { rateLimit } from "../src/middleware/rate-limit.js";
import { toolLogging } from "../src/middleware/logging.js";
import type { ToolMiddleware } from "../src/types.js";

describe("Middleware", () => {
  describe("tool middleware", () => {
    it("runs middleware in order", async () => {
      const order: string[] = [];

      const mw1: ToolMiddleware = async (_input, _ctx, next) => {
        order.push("mw1-before");
        const result = await next();
        order.push("mw1-after");
        return result;
      };

      const mw2: ToolMiddleware = async (_input, _ctx, next) => {
        order.push("mw2-before");
        const result = await next();
        order.push("mw2-after");
        return result;
      };

      const builder = createServer({
        name: "test",
        version: "1.0.0",
      })
        .useToolMiddleware(mw1)
        .useToolMiddleware(mw2)
        .tool("test", "Test tool", z.object({}), async () => {
          order.push("handler");
          return text("ok");
        });

      const harness = createTestHarness(builder);
      await harness.setup();
      await harness.callTool("test", {});
      await harness.teardown();

      expect(order).toEqual([
        "mw1-before",
        "mw2-before",
        "handler",
        "mw2-after",
        "mw1-after",
      ]);
    });

    it("can short-circuit execution", async () => {
      const blocker: ToolMiddleware = async () => {
        return text("blocked");
      };

      const builder = createServer({
        name: "test",
        version: "1.0.0",
      })
        .useToolMiddleware(blocker)
        .tool("test", "Test", z.object({}), async () => text("should not run"));

      const harness = createTestHarness(builder);
      await harness.setup();
      const result = await harness.callTool("test", {});
      await harness.teardown();

      expect(result.content[0]).toEqual({ type: "text", text: "blocked" });
    });
  });

  describe("rate limiting", () => {
    it("allows requests within limit", async () => {
      const builder = createServer({
        name: "test",
        version: "1.0.0",
      })
        .use(rateLimit({ windowMs: 1000, maxRequests: 5 }))
        .tool("test", "Test", z.object({}), async () => text("ok"));

      const harness = createTestHarness(builder);
      await harness.setup();

      // Should work for first 5 requests
      for (let i = 0; i < 5; i++) {
        const result = await harness.callTool("test", {});
        expect(result.content[0]).toEqual({ type: "text", text: "ok" });
      }

      // 6th should be rate limited
      const response = await harness.send("tools/call", {
        name: "test",
        arguments: {},
      });
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32007);

      await harness.teardown();
    });
  });
});
