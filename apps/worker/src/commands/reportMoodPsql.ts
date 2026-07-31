import "dotenv/config";
import { psqlJson } from "../../../../packages/db/src/psql.js";
import { calculateMarketMeters } from "../../../../packages/scoring/src/marketMeters.js";
import type { MoodCategory } from "../../../../packages/scoring/src/moodTaxonomy.js";

type MoodReportRow = {
  slug: string;
  name: string;
  snapshotDate: string;
  totalItems: number;
  personality: string;
  summary: string;
  moodScores: Record<string, number>;
  topNarratives: Array<{ phrase: string; count: number }>;
};

function topScores(scores: Record<string, number>) {
  return Object.entries(scores)
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([key, value]) => `${key.replace(/_/g, " ")}=${value}`)
    .join(", ");
}

function topNarratives(narratives: Array<{ phrase: string; count: number }>) {
  if (narratives.length === 0) return "none";
  return narratives
    .slice(0, 5)
    .map((narrative) => `${narrative.phrase} (${narrative.count})`)
    .join(", ");
}

async function main() {
  const rows =
    (await psqlJson<MoodReportRow[] | null>(`
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          i.slug,
          i.name,
          m."snapshotDate"::date AS "snapshotDate",
          m."totalItems",
          m.personality,
          m.summary,
          m."moodScores",
          m."topNarratives"
        FROM "MoodScoreSnapshot" m
        JOIN "Ipo" i ON i.id = m."ipoId"
        WHERE m."snapshotDate" = (SELECT MAX("snapshotDate") FROM "MoodScoreSnapshot")
        ORDER BY i.slug
      ) t;
    `)) ?? [];

  if (rows.length === 0) {
    console.log("No mood snapshots found. Run npm run score:mood:psql first.");
    return;
  }

  console.log(`IPO Mood Report (${String(rows[0].snapshotDate).slice(0, 10)})`);
  console.log("");

  for (const row of rows) {
    console.log(`${row.name} (${row.slug})`);
    console.log(`  Mood: ${row.personality}`);
    console.log(`  Items: ${row.totalItems}`);
    console.log(`  Scores: ${topScores(row.moodScores) || "none"}`);
    const meters = calculateMarketMeters(row.moodScores as Record<MoodCategory, number>);
    console.log(
      `  Meters: ${meters.listing_gain_potential.label} ${meters.listing_gain_potential.score} (${meters.listing_gain_potential.verdict}); ${meters.long_term_benefit.label} ${meters.long_term_benefit.score} (${meters.long_term_benefit.verdict})`
    );
    console.log(`  Narratives: ${topNarratives(row.topNarratives)}`);
    console.log(`  Summary: ${row.summary}`);
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
