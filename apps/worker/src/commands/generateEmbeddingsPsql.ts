import "dotenv/config";
import { randomUUID } from "node:crypto";
import { psqlExec, psqlJson, sqlString } from "../../../../packages/db/src/psql.js";
import { optionalFloatEnv } from "../../../../packages/shared/src/env.js";
import { EMBEDDING_MODEL } from "../../../../packages/embeddings/src/embeddingProcessor.js";
import { upsertPineconeTextRecords, type PineconeTextRecord } from "../../../../packages/embeddings/src/pineconeClient.js";

type EligibleCleanedItem = {
  id: string;
  ipoId: string;
  cleanedText: string;
  spamScore: number;
  createdAt: string;
  ipoSlug: string;
  ipoName: string;
  source: string;
  likes: number | null;
  timestamp: string | null;
};

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry<T>(label: string, operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;

      const delayMs = 1000 * attempt;
      console.warn(`${label} failed on attempt ${attempt}/${attempts}; retrying in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function vectorId(item: EligibleCleanedItem) {
  return `${item.source}:${item.id}`;
}

function timestampSeconds(value: string | null, fallback: string) {
  return Math.floor(new Date(value ?? fallback).getTime() / 1000);
}

async function main() {
  const spamThreshold = optionalFloatEnv("SPAM_SCORE_SKIP_THRESHOLD", 0.75);
  const batchSize = Number.parseInt(process.env.PINECONE_UPSERT_BATCH_SIZE ?? "50", 10);
  const limit = Number.parseInt(process.env.EMBEDDING_PSQL_LIMIT ?? "500", 10);

  console.log("Loading cleaned items via psql...");
  const items =
    (await psqlJson<EligibleCleanedItem[] | null>(`
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          c.id,
          c."ipoId",
          c."cleanedText",
          c."spamScore",
          c."createdAt",
          i.slug AS "ipoSlug",
          i.name AS "ipoName",
          r.source,
          r.likes,
          r.timestamp
        FROM "CleanedTextItem" c
        JOIN "Ipo" i ON i.id = c."ipoId"
        JOIN "RawTextItem" r ON r.id = c."rawTextItemId"
        LEFT JOIN "EmbeddingRecord" e ON e."cleanedTextItemId" = c.id
        WHERE c."isDuplicate" = false
          AND c."spamScore" < ${spamThreshold}
          AND e.id IS NULL
        ORDER BY c."createdAt" ASC
        LIMIT ${limit}
      ) t;
    `)) ?? [];

  console.log(`Found ${items.length} cleaned items eligible for Pinecone upsert`);

  let pineconeUpserts = 0;
  let embeddingRecords = 0;
  const batches = chunk(items, Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 50);

  for (const [batchIndex, batch] of batches.entries()) {
    console.log(`Upserting Pinecone batch ${batchIndex + 1}/${batches.length} (${batch.length} records)`);

    const records: PineconeTextRecord[] = batch.map((item) => ({
      id: vectorId(item),
      text: item.cleanedText,
      metadata: {
        ipo_id: item.ipoId,
        ipo_slug: item.ipoSlug,
        ipo_name: item.ipoName,
        source: item.source,
        timestamp: timestampSeconds(item.timestamp, item.createdAt),
        text_item_id: item.id,
        likes: item.likes ?? 0,
        spam_score: item.spamScore
      }
    }));

    pineconeUpserts += await retry(`Pinecone batch ${batchIndex + 1}`, () => upsertPineconeTextRecords(records), 4);

    const now = new Date().toISOString();
    const values = batch
      .map((item) =>
        [
          sqlString(randomUUID()),
          sqlString(item.id),
          sqlString(item.ipoId),
          sqlString(vectorId(item)),
          sqlString(EMBEDDING_MODEL),
          sqlString(now),
          sqlString(now)
        ].join(", ")
      )
      .map((valueList) => `(${valueList})`)
      .join(",\n");

    await retry(
      `EmbeddingRecord insert batch ${batchIndex + 1}`,
      () =>
        psqlExec(`
          INSERT INTO "EmbeddingRecord"
            (id, "cleanedTextItemId", "ipoId", "pineconeVectorId", "embeddingModel", "createdAt", "updatedAt")
          VALUES
            ${values}
          ON CONFLICT ("cleanedTextItemId") DO NOTHING;
        `),
      3
    );
    embeddingRecords += batch.length;
  }

  console.log(`Embeddings complete: ${embeddingRecords} records stored, ${pineconeUpserts} Pinecone upserts`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
