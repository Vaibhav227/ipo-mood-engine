import "dotenv/config";
import { randomUUID } from "node:crypto";
import { psqlExec, psqlJson, sqlString } from "../../../../packages/db/src/psql.js";
import { scoreMood, type MoodInputItem } from "../../../../packages/scoring/src/moodScorer.js";

type IpoWithText = {
  id: string;
  slug: string;
  name: string;
  items: Array<MoodInputItem & { createdAt: string }>;
};

const snapshotDate = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
};

const jsonSql = (value: unknown) => sqlString(JSON.stringify(value));

async function main() {
  console.log("Loading cleaned text for mood scoring...");

  const ipos =
    (await psqlJson<IpoWithText[] | null>(`
      SELECT COALESCE(json_agg(row_to_json(ipo_rows)), '[]'::json)
      FROM (
        SELECT
          i.id,
          i.slug,
          i.name,
          COALESCE(
            json_agg(
              json_build_object(
                'text', c."cleanedText",
                'source', r.source,
                'timestamp', COALESCE(r.timestamp, c."createdAt"),
                'createdAt', c."createdAt",
                'likes', r.likes,
                'spamScore', c."spamScore"
              )
              ORDER BY COALESCE(r.timestamp, c."createdAt") DESC
            ) FILTER (WHERE c.id IS NOT NULL),
            '[]'::json
          ) AS items
        FROM "Ipo" i
        LEFT JOIN "CleanedTextItem" c
          ON c."ipoId" = i.id
          AND c."isDuplicate" = false
          AND c."spamScore" < 0.75
        LEFT JOIN "RawTextItem" r ON r.id = c."rawTextItemId"
        GROUP BY i.id, i.slug, i.name
        ORDER BY i.name ASC
      ) ipo_rows;
    `)) ?? [];

  const today = snapshotDate();
  let snapshots = 0;

  for (const ipo of ipos) {
    if (ipo.items.length === 0) {
      console.log(`Skipping ${ipo.slug}: no cleaned text`);
      continue;
    }

    const result = scoreMood(ipo.items);
    const sortedDates = ipo.items
      .map((item) => new Date(item.timestamp ?? item.createdAt).toISOString())
      .sort();
    const sourceWindowStartedAt = sortedDates[0] ?? today;
    const sourceWindowEndedAt = sortedDates[sortedDates.length - 1] ?? today;

    await psqlExec(`
      INSERT INTO "MoodScoreSnapshot"
        (
          id,
          "ipoId",
          "snapshotDate",
          "sourceWindowStartedAt",
          "sourceWindowEndedAt",
          "totalItems",
          "moodScores",
          "topNarratives",
          personality,
          summary,
          "createdAt",
          "updatedAt"
        )
      VALUES
        (
          ${sqlString(randomUUID())},
          ${sqlString(ipo.id)},
          ${sqlString(today)},
          ${sqlString(sourceWindowStartedAt)},
          ${sqlString(sourceWindowEndedAt)},
          ${ipo.items.length},
          ${jsonSql(result.scores)},
          ${jsonSql(result.topNarratives)},
          ${sqlString(result.personality)},
          ${sqlString(result.summary)},
          ${sqlString(new Date().toISOString())},
          ${sqlString(new Date().toISOString())}
        )
      ON CONFLICT ("ipoId", "snapshotDate") DO UPDATE SET
        "sourceWindowStartedAt" = EXCLUDED."sourceWindowStartedAt",
        "sourceWindowEndedAt" = EXCLUDED."sourceWindowEndedAt",
        "totalItems" = EXCLUDED."totalItems",
        "moodScores" = EXCLUDED."moodScores",
        "topNarratives" = EXCLUDED."topNarratives",
        personality = EXCLUDED.personality,
        summary = EXCLUDED.summary,
        "updatedAt" = EXCLUDED."updatedAt";
    `);

    snapshots += 1;
    console.log(`${ipo.slug}: ${result.personality} (${ipo.items.length} items)`);
  }

  console.log(`Mood scoring complete: ${snapshots} snapshots written`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
