import type { Logger } from "./types.js";

/**
 * Lightweight stderr logger (MCP servers must not write to stdout).
 * Uses structured JSON by default, pretty-prints in dev mode.
 */
export function createLogger(opts: {
  level?: string;
  pretty?: boolean;
  name?: string;
}): Logger {
  const levels: Record<string, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
    silent: 100,
  };

  const minLevel = levels[opts.level ?? "info"] ?? 30;
  const pretty = opts.pretty ?? process.env.NODE_ENV === "development";
  const baseName = opts.name ?? "forge-mcp";

  function write(
    level: string,
    levelNum: number,
    msg: string,
    extra: Record<string, unknown>
  ): void {
    if (levelNum < minLevel) return;

    if (pretty) {
      const ts = new Date().toISOString();
      const prefix = `${ts} [${level.toUpperCase().padEnd(5)}] ${baseName}`;
      const extraStr =
        Object.keys(extra).length > 0
          ? ` ${JSON.stringify(extra)}`
          : "";
      process.stderr.write(`${prefix}: ${msg}${extraStr}\n`);
    } else {
      const entry = {
        level: levelNum,
        time: Date.now(),
        name: baseName,
        msg,
        ...extra,
      };
      process.stderr.write(JSON.stringify(entry) + "\n");
    }
  }

  function makeLogger(bindings: Record<string, unknown>): Logger {
    return {
      trace: (msg, ...args) =>
        write("trace", 10, msg, { ...bindings, ...(args[0] as Record<string, unknown> ?? {}) }),
      debug: (msg, ...args) =>
        write("debug", 20, msg, { ...bindings, ...(args[0] as Record<string, unknown> ?? {}) }),
      info: (msg, ...args) =>
        write("info", 30, msg, { ...bindings, ...(args[0] as Record<string, unknown> ?? {}) }),
      warn: (msg, ...args) =>
        write("warn", 40, msg, { ...bindings, ...(args[0] as Record<string, unknown> ?? {}) }),
      error: (msg, ...args) =>
        write("error", 50, msg, { ...bindings, ...(args[0] as Record<string, unknown> ?? {}) }),
      fatal: (msg, ...args) =>
        write("fatal", 60, msg, { ...bindings, ...(args[0] as Record<string, unknown> ?? {}) }),
      child: (childBindings) =>
        makeLogger({ ...bindings, ...childBindings }),
    };
  }

  return makeLogger({});
}
