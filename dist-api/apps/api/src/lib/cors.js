const defaultOrigins = ["http://localhost:5173", "http://localhost:3000"];
export function allowedOrigins() {
    return (process.env.API_ALLOWED_ORIGINS ?? defaultOrigins.join(","))
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}
export async function corsMiddleware(c, next) {
    const origin = c.req.header("origin");
    const origins = allowedOrigins();
    if (origin && origins.includes(origin)) {
        c.header("Access-Control-Allow-Origin", origin);
        c.header("Vary", "Origin");
    }
    c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    c.header("Access-Control-Max-Age", "86400");
    if (c.req.method === "OPTIONS") {
        return c.body(null, 204);
    }
    await next();
}
