import { prisma } from "../../../../packages/db/src/client.js";
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

type SnapshotWithIpo = {
  snapshotDate: Date;
  sourceWindowStartedAt: Date | null;
  sourceWindowEndedAt: Date | null;
  totalItems: number;
  personality: string;
  summary: string;
  moodScores: unknown;
  topNarratives: unknown;
  ipo: { slug: string; name: string };
};

function toSnapshotRow(snapshot: SnapshotWithIpo): MoodSnapshotRow {
  return {
    slug: snapshot.ipo.slug,
    name: snapshot.ipo.name,
    snapshotDate: snapshot.snapshotDate.toISOString().slice(0, 10),
    sourceWindowStartedAt: snapshot.sourceWindowStartedAt?.toISOString() ?? null,
    sourceWindowEndedAt: snapshot.sourceWindowEndedAt?.toISOString() ?? null,
    totalItems: snapshot.totalItems,
    personality: snapshot.personality,
    summary: snapshot.summary,
    moodScores: snapshot.moodScores as Record<string, number>,
    topNarratives: snapshot.topNarratives as Array<{ phrase: string; count: number }>
  };
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

const ipoSelect = { slug: true, name: true } as const;

export async function getLatestMoodSnapshots() {
  const latest = await prisma.moodScoreSnapshot.aggregate({
    _max: { snapshotDate: true }
  });
  const latestDate = latest._max.snapshotDate;

  if (!latestDate) {
    return { date: null, count: 0, items: [] };
  }

  const rows = await prisma.moodScoreSnapshot.findMany({
    where: { snapshotDate: latestDate },
    include: { ipo: { select: ipoSelect } },
    orderBy: { ipo: { slug: "asc" } }
  });

  const snapshots = addMarketMeters(rows.map(toSnapshotRow));

  return {
    date: snapshots[0]?.snapshotDate ?? null,
    count: snapshots.length,
    items: snapshots
  };
}

export async function getLatestMoodBySlug(slug: string) {
  const row = await prisma.moodScoreSnapshot.findFirst({
    where: { ipo: { slug } },
    include: { ipo: { select: ipoSelect } },
    orderBy: { snapshotDate: "desc" }
  });

  return row ? withMarketMeters(toSnapshotRow(row)) : null;
}

export async function getMoodHistoryBySlug(slug: string, limit: number) {
  const rows = await prisma.moodScoreSnapshot.findMany({
    where: { ipo: { slug } },
    include: { ipo: { select: ipoSelect } },
    orderBy: { snapshotDate: "desc" },
    take: limit
  });

  const items = addMarketMeters(rows.map(toSnapshotRow));

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
