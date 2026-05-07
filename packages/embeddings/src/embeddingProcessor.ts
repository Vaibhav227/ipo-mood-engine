import type { PrismaClient } from "@prisma/client";
import { optionalFloatEnv } from "../../shared/src/env.js";
import { upsertPineconeTextRecords, type PineconeTextRecord } from "./pineconeClient.js";

export const EMBEDDING_MODEL = "pinecone-integrated";

export async function generateAndStoreEmbeddings(prisma: PrismaClient) {
  const spamThreshold = optionalFloatEnv("SPAM_SCORE_SKIP_THRESHOLD", 0.75);
  const cleanedItems = await prisma.cleanedTextItem.findMany({
    where: {
      isDuplicate: false,
      spamScore: { lt: spamThreshold },
      embeddingRecords: { none: {} }
    },
    include: {
      ipo: true,
      rawTextItem: true
    }
  });

  let embeddingsGenerated = 0;
  let pineconeUpserts = 0;
  let spamSkipped = 0;

  for (const item of cleanedItems) {
    if (item.spamScore >= spamThreshold) {
      spamSkipped += 1;
      continue;
    }

    const vectorId = `${item.rawTextItem.source}:${item.id}`;
    const timestamp = item.rawTextItem.timestamp
      ? Math.floor(item.rawTextItem.timestamp.getTime() / 1000)
      : Math.floor(item.createdAt.getTime() / 1000);
    const vector: PineconeTextRecord = {
      id: vectorId,
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

    pineconeUpserts += await upsertPineconeTextRecords([vector]);
    embeddingsGenerated += 1;

    await prisma.embeddingRecord.create({
      data: {
        cleanedTextItemId: item.id,
        ipoId: item.ipoId,
        pineconeVectorId: vectorId,
        embeddingModel: EMBEDDING_MODEL
      }
    });
  }

  return { embeddingsGenerated, pineconeUpserts, spamSkipped };
}
