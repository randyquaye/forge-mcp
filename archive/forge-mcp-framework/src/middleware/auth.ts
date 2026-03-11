import type { ServerMiddleware } from "../types.js";
import { UnauthorizedError } from "../errors.js";

/**
 * Bearer token authentication middleware.
 */
export function bearerAuth(
  validate: (token: string) => Promise<boolean> | boolean
): ServerMiddleware {
  return async (request, next) => {
    // Auth is only meaningful for SSE transport; stdio is implicitly trusted.
    // For SSE, the token would be passed in the request metadata.
    const meta = request.params?._meta as
      | { authorization?: string }
      | undefined;
    const authHeader = meta?.authorization;

    if (!authHeader) {
      throw new UnauthorizedError("Missing authorization");
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    const valid = await validate(token);
    if (!valid) {
      throw new UnauthorizedError("Invalid token");
    }

    return next();
  };
}

/**
 * API key authentication middleware.
 */
export function apiKeyAuth(validKeys: Set<string>): ServerMiddleware {
  return async (request, next) => {
    const meta = request.params?._meta as
      | { apiKey?: string }
      | undefined;
    const key = meta?.apiKey;

    if (!key || !validKeys.has(key)) {
      throw new UnauthorizedError("Invalid API key");
    }

    return next();
  };
}
