import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { corsMiddleware } from "./lib/cors.js";
import { moodRoutes } from "./routes/mood.js";

const app = new Hono();

app.use("*", corsMiddleware);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "ipo-mood-engine",
    time: new Date().toISOString()
  })
);

app.route("/api/mood", moodRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
});

const port = Number.parseInt(process.env.API_PORT ?? process.env.PORT ?? "4000", 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`IPO Mood API listening on http://localhost:${info.port}`);
});

export default app;
