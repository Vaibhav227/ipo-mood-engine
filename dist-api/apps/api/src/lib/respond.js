export function cachedJson(c, data, maxAgeSeconds = 60) {
    c.header("Cache-Control", `public, max-age=${maxAgeSeconds}`);
    return c.json(data);
}
export function errorJson(c, status, message) {
    return c.json({ error: message }, status);
}
