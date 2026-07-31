import { psqlJson } from "../../../../packages/db/src/psql.js";
import { calculateMarketMeters, type MarketMeters } from "../../../../packages/scoring/src/marketMeters.js";

type MoodSnapshotRow = {
  slug: string;
  name: string;
  snapshotDate: string;
  sourceWindowStartedAt: string | null;
  sourceWindowEndedAt: string | null;
  totalItems: number;
  personality: string;
  summary: string;
  moodScores: Record<string, number>;
  topNarratives: Array<{ phrase: string; count: number }>;
};

type MoodSnapshot = MoodSnapshotRow & {
  marketMeters: MarketMeters;
};

const latestSnapshotWhere = `m."snapshotDate" = (SELECT MAX("snapshotDate") FROM "MoodScoreSnapshot")`;

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}

function snapshotSelect() {
  return `
    i.slug,
    i.name,
    m."snapshotDate"::date AS "snapshotDate",
    m."sourceWindowStartedAt" AS "sourceWindowStartedAt",
    m."sourceWindowEndedAt" AS "sourceWindowEndedAt",
    m."totalItems" AS "totalItems",
    m.personality,
    m.summary,
    m."moodScores" AS "moodScores",
    m."topNarratives" AS "topNarratives"
  `;
}

function withMarketMeters(item: MoodSnapshotRow): MoodSnapshot {
  return {
    ...item,
    marketMeters: calculateMarketMeters(item.moodScores)
  };
}

function addMarketMeters(items: MoodSnapshotRow[]) {
  return items.map((item) => withMarketMeters(item));
}

export async function getLatestMoodSnapshots() {
  const items =
    (await psqlJson<MoodSnapshotRow[]>(`
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT ${snapshotSelect()}
        FROM "MoodScoreSnapshot" m
        JOIN "Ipo" i ON i.id = m."ipoId"
        WHERE ${latestSnapshotWhere}
        ORDER BY i.slug
      ) t;
    `)) ?? [];

  const snapshots = addMarketMeters(items);

  return {
    date: snapshots[0]?.snapshotDate ?? null,
    count: snapshots.length,
    items: snapshots
  };
}

export async function getLatestMoodBySlug(slug: string) {
  const item = await psqlJson<MoodSnapshotRow | null>(`
    SELECT row_to_json(t)
    FROM (
      SELECT ${snapshotSelect()}
      FROM "MoodScoreSnapshot" m
      JOIN "Ipo" i ON i.id = m."ipoId"
      WHERE i.slug = '${escapeSql(slug)}'
      ORDER BY m."snapshotDate" DESC
      LIMIT 1
    ) t;
  `);

  return item ? withMarketMeters(item) : null;
}

export async function getMoodHistoryBySlug(slug: string, limit: number) {
  const rows =
    (await psqlJson<MoodSnapshotRow[]>(`
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT ${snapshotSelect()}
        FROM "MoodScoreSnapshot" m
        JOIN "Ipo" i ON i.id = m."ipoId"
        WHERE i.slug = '${escapeSql(slug)}'
        ORDER BY m."snapshotDate" DESC
        LIMIT ${limit}
      ) t;
    `)) ?? [];

  const items = addMarketMeters(rows);

  return {
    slug,
    name: items[0]?.name ?? null,
    count: items.length,
    items
  };
}

export async function getMarketMood() {
  const latest = await getLatestMoodSnapshots();
  const moodCounts = new Map<string, number>();
  const scoreTotals = new Map<string, number>();
  const meterTotals = new Map<string, number>();
  const narrativeTotals = new Map<string, number>();
  let totalItems = 0;

  for (const item of latest.items) {
    totalItems += item.totalItems;
    moodCounts.set(item.personality, (moodCounts.get(item.personality) ?? 0) + 1);

    for (const [key, value] of Object.entries(item.moodScores ?? {})) {
      scoreTotals.set(key, (scoreTotals.get(key) ?? 0) + Number(value));
    }

    for (const key of ["listing_gain_potential", "long_term_benefit"] as const) {
      const meter = item.marketMeters[key];
      meterTotals.set(key, (meterTotals.get(key) ?? 0) + meter.score);
    }

    for (const narrative of item.topNarratives ?? []) {
      narrativeTotals.set(narrative.phrase, (narrativeTotals.get(narrative.phrase) ?? 0) + narrative.count);
    }
  }

  const ipoCount = Math.max(1, latest.items.length);
  const averageScores = Object.fromEntries(
    Array.from(scoreTotals.entries())
      .map(([key, value]) => [key, Math.round(value / ipoCount)])
      .filter(([, value]) => Number(value) > 0)
      .sort(([, a], [, b]) => Number(b) - Number(a))
  );
  const averageMeters = Object.fromEntries(
    Array.from(meterTotals.entries()).map(([key, value]) => [key, Math.round(value / ipoCount)])
  );
  const leaders = {
    listing_gain_potential: latest.items
      .map((item) => ({
        slug: item.slug,
        name: item.name,
        score: item.marketMeters.listing_gain_potential.score,
        verdict: item.marketMeters.listing_gain_potential.verdict
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
    long_term_benefit: latest.items
      .map((item) => ({
        slug: item.slug,
        name: item.name,
        score: item.marketMeters.long_term_benefit.score,
        verdict: item.marketMeters.long_term_benefit.verdict
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  };

  return {
    date: latest.date,
    ipoCount: latest.items.length,
    totalItems,
    dominantMood: Array.from(moodCounts.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null,
    averageScores,
    averageMeters,
    leaders,
    topNarratives: Array.from(narrativeTotals.entries())
      .map(([phrase, count]) => ({ phrase, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  };
}
