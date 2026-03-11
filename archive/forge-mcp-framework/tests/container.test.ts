import { describe, it, expect } from "vitest";
import { Container } from "../src/container.js";

describe("Container (DI)", () => {
  it("registers and resolves providers", async () => {
    const container = new Container();
    container.register({
      key: "db",
      factory: () => ({ connected: true }),
    });

    const db = await container.get<{ connected: boolean }>("db");
    expect(db.connected).toBe(true);
  });

  it("returns the same instance on subsequent gets", async () => {
    const container = new Container();
    let callCount = 0;
    container.register({
      key: "service",
      factory: () => {
        callCount++;
        return { id: callCount };
      },
    });

    const first = await container.get("service");
    const second = await container.get("service");
    expect(first).toBe(second);
    expect(callCount).toBe(1);
  });

  it("disposes providers in reverse order", async () => {
    const order: string[] = [];
    const container = new Container();

    container.register({
      key: "a",
      factory: () => "a",
      dispose: () => { order.push("a"); },
    });
    container.register({
      key: "b",
      factory: () => "b",
      dispose: () => { order.push("b"); },
    });

    await container.initializeAll();
    await container.dispose();

    expect(order).toEqual(["b", "a"]);
  });

  it("throws on duplicate registration", () => {
    const container = new Container();
    container.register({ key: "x", factory: () => 1 });
    expect(() =>
      container.register({ key: "x", factory: () => 2 })
    ).toThrow("already registered");
  });

  it("throws on missing provider", async () => {
    const container = new Container();
    await expect(container.get("missing")).rejects.toThrow("No provider");
  });

  it("getSync throws if not initialized", () => {
    const container = new Container();
    container.register({ key: "x", factory: () => 1 });
    expect(() => container.getSync("x")).toThrow("not initialized");
  });
});
