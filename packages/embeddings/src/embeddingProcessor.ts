import type { PrismaClient } from "@prisma/client";
import { withTimeout } from "../../db/src/withTimeout.js";
import { optionalFloatEnv } from "../../shared/src/env.js";
import { upsertPineconeTextRecords, type PineconeTextRecord } from "./pineconeClient.js";

export const EMBEDDING_MODEL = "pinecone-inference";

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export async function generateAndStoreEmbeddings(prisma: PrismaClient) {
  const spamThreshold = optionalFloatEnv("SPAM_SCORE_SKIP_THRESHOLD", 0.75);
  const batchSize = Number.parseInt(process.env.PINECONE_UPSERT_BATCH_SIZE ?? "50", 10);
  console.log("Loading cleaned items eligible for Pinecone upsert...");
  const cleanedItems = await withTimeout(
    prisma.cleanedTextItem.findMany({
      where: {
        isDuplicate: false,
        spamScore: { lt: spamThreshold },
        embeddingRecords: { none: {} }
      },
      include: {
        ipo: true,
        rawTextItem: true
      }
    }),
    "Load cleaned items for Pinecone upsert",
    15000
  );

  console.log(`Found ${cleanedItems.length} cleaned items eligible for Pinecone upsert`);

  let embeddingsGenerated = 0;
  let pineconeUpserts = 0;
  let spamSkipped = 0;
  const batches = chunk(cleanedItems, Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 50);

  for (const [batchIndex, batch] of batches.entries()) {
    console.log(`Upserting Pinecone batch ${batchIndex + 1}/${batches.length} (${batch.length} records)`);

    const records: PineconeTextRecord[] = batch
      .filter((item) => {
        const shouldInclude = item.spamScore < spamThreshold;
        if (!shouldInclude) spamSkipped += 1;
        return shouldInclude;
      })
      .map((item) => {
        const timestamp = item.rawTextItem.timestamp
          ? Math.floor(item.rawTextItem.timestamp.getTime() / 1000)
          : Math.floor(item.createdAt.getTime() / 1000);

        return {
          id: `${item.rawTextItem.source}:${item.id}`,
          text: item.cleanedText,
          metadata: {
            ipo_id: item.ipoId,
            ipo_slug: item.ipo.slug,
            ipo_name: item.ipo.name,
            source: item.rawTextItem.source,
            timestamp,
            text_item_id: item.id,
            likes: item.rawTextItem.likes ?? 0,
            spam_score: item.spamScore
          }
        };
      });

    if (records.length === 0) continue;

    pineconeUpserts += await withTimeout(
      upsertPineconeTextRecords(records),
      `Pinecone upsert batch ${batchIndex + 1}`,
      30000
    );
    embeddingsGenerated += records.length;

    await withTimeout(
      prisma.embeddingRecord.createMany({
        data: batch.map((item) => ({
          cleanedTextItemId: item.id,
          ipoId: item.ipoId,
          pineconeVectorId: `${item.rawTextItem.source}:${item.id}`,
          embeddingModel: EMBEDDING_MODEL
        })),
        skipDuplicates: true
      }),
      `Store embedding records batch ${batchIndex + 1}`,
      15000
    );
  }

  return { embeddingsGenerated, pineconeUpserts, spamSkipped };
}
