import type { ServerMiddleware } from "../types.js";
import { RateLimitError } from "../errors.js";

/**
 * Sliding window rate limiter middleware.
 */
export function rateLimit(opts: {
  windowMs: number;
  maxRequests: number;
}): ServerMiddleware {
  const windows = new Map<string, number[]>();

  // Periodic cleanup
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of windows) {
      const valid = timestamps.filter((t) => now - t < opts.windowMs);
      if (valid.length === 0) {
        windows.delete(key);
      } else {
        windows.set(key, valid);
      }
    }
  }, opts.windowMs);

  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }

  return async (_request, next) => {
    // For stdio, use a single key; for SSE, could use client ID
    const key = "global";
    const now = Date.now();
    const timestamps = windows.get(key) ?? [];
    const valid = timestamps.filter((t) => now - t < opts.windowMs);

    if (valid.length >= opts.maxRequests) {
      throw new RateLimitError();
    }

    valid.push(now);
    windows.set(key, valid);

    return next();
  };
}
