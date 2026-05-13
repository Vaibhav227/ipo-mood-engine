import type { Prisma, PrismaClient } from "@prisma/client";
import type { CollectedTextItem } from "../../shared/src/types.js";
import { withTimeout } from "../../db/src/withTimeout.js";

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export async function storeRawTextItems(prisma: PrismaClient, items: CollectedTextItem[]) {
  const matched = items.filter((item) => item.matchStatus === "matched").length;
  let inserted = 0;
  const chunks = chunk(items, 100);

  for (const [index, batch] of chunks.entries()) {
    console.log(`Storing raw text batch ${index + 1}/${chunks.length} (${batch.length} items)`);

    try {
      const result = await withTimeout(
        prisma.rawTextItem.createMany({
          data: batch.map((item) => ({
            ipoId: item.ipoId,
            source: item.source,
            sourceUrl: item.sourceUrl,
            externalId: item.externalId,
            rawText: item.rawText,
            author: item.author,
            timestamp: item.timestamp,
            likes: item.likes,
            commentsCount: item.commentsCount,
            metadata: item.metadata as Prisma.InputJsonValue | undefined,
            matchStatus: item.matchStatus
          })),
          skipDuplicates: true
        }),
        `Store raw text batch ${index + 1}`,
        15000
      );
      inserted += result.count;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Server has closed the connection") && !message.includes("P1017")) {
        throw error;
      }

      console.warn(`Retrying after closed DB connection for raw text batch ${index + 1}`);
      await prisma.$disconnect();
      const result = await withTimeout(
        prisma.rawTextItem.createMany({
          data: batch.map((item) => ({
            ipoId: item.ipoId,
            source: item.source,
            sourceUrl: item.sourceUrl,
            externalId: item.externalId,
            rawText: item.rawText,
            author: item.author,
            timestamp: item.timestamp,
            likes: item.likes,
            commentsCount: item.commentsCount,
            metadata: item.metadata as Prisma.InputJsonValue | undefined,
            matchStatus: item.matchStatus
          })),
          skipDuplicates: true
        }),
        `Retry raw text batch ${index + 1}`,
        15000
      );
      inserted += result.count;
    }
  }

  return { collected: inserted, matched };
}
