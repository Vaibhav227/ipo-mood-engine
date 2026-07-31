import { Hono } from "hono";
import { cachedJson, errorJson } from "../lib/respond.js";
import { getLatestMoodBySlug, getLatestMoodSnapshots, getMarketMood, getMoodHistoryBySlug } from "../lib/moodQueries.js";
export const moodRoutes = new Hono();
moodRoutes.get("/latest", async (c) => cachedJson(c, await getLatestMoodSnapshots()));
moodRoutes.get("/market", async (c) => cachedJson(c, await getMarketMood()));
moodRoutes.get("/:slug/history", async (c) => {
    const limitParam = Number.parseInt(c.req.query("limit") ?? "30", 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 30;
    const history = await getMoodHistoryBySlug(c.req.param("slug"), limit);
    if (history.count === 0) {
        return errorJson(c, 404, "Mood history not found");
    }
    return cachedJson(c, history);
});
moodRoutes.get("/:slug", async (c) => {
    const snapshot = await getLatestMoodBySlug(c.req.param("slug"));
    if (!snapshot) {
        return errorJson(c, 404, "Mood snapshot not found");
    }
    return cachedJson(c, snapshot);
});
