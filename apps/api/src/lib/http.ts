import { HTTPException } from "hono/http-exception";

export const HTTP = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
} as const;

export const METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  OPTIONS: "OPTIONS",
  HEAD: "HEAD",
} as const;

export const BEARER_PREFIX = "Bearer ";
export const REQ_ID_RADIX = 36;
export const DEFAULT_SLOW_MS = 200;

export function ensure(
  condition: unknown,
  message: string,
  status: (typeof HTTP)[keyof typeof HTTP] = HTTP.BAD_REQUEST
): asserts condition {
  if (!condition) throw new HTTPException(status, { message });
}

export function getAccessTokenFromHeader(header?: string | null): string | undefined {
  if (!header) return undefined;
  return header.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : undefined;
}

export function parseScopes(scope?: string): string[] {
  return scope ? scope.split(" ").filter(Boolean) : [];
}
