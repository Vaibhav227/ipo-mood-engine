import type { Prisma, PrismaClient } from "@prisma/client";
import type { CollectedTextItem } from "../../shared/src/types.js";

export async function storeRawTextItems(prisma: PrismaClient, items: CollectedTextItem[]) {
  let collected = 0;
  let matched = 0;

  for (const item of items) {
    const saved = await prisma.rawTextItem.upsert({
      where: {
        source_externalId: {
          source: item.source,
          externalId: item.externalId
        }
      },
      update: {
        ipoId: item.ipoId,
        sourceUrl: item.sourceUrl,
        rawText: item.rawText,
        author: item.author,
        timestamp: item.timestamp,
        likes: item.likes,
        commentsCount: item.commentsCount,
        metadata: item.metadata as Prisma.InputJsonValue | undefined,
        matchStatus: item.matchStatus
      },
      create: {
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
      }
    });

    collected += saved.createdAt.getTime() === saved.updatedAt.getTime() ? 1 : 0;
    if (item.matchStatus === "matched") matched += 1;
  }

  return { collected: items.length, matched };
}
