import type { Context } from "hono";

export function cachedJson(c: Context, data: unknown, maxAgeSeconds = 60) {
  c.header("Cache-Control", `public, max-age=${maxAgeSeconds}`);
  return c.json(data);
}

export function errorJson(c: Context, status: 400 | 404 | 500, message: string) {
  return c.json({ error: message }, status);
}
