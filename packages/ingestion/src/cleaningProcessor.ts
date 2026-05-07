import type { PrismaClient } from "@prisma/client";
import { cleanText } from "./textCleaner.js";

export async function cleanStoredRawItems(prisma: PrismaClient) {
  const rawItems = await prisma.rawTextItem.findMany({
    where: {
      matchStatus: "matched",
      ipoId: { not: null },
      cleanedTextItems: { none: {} }
    }
  });

  let cleaned = 0;
  let duplicates = 0;
  const seenKeys = new Set<string>();

  for (const rawItem of rawItems) {
    if (!rawItem.ipoId) continue;

    const result = cleanText(rawItem.rawText);
    const existingDuplicate = await prisma.cleanedTextItem.findFirst({
      where: {
        duplicateKey: result.duplicateKey
      },
      select: { id: true }
    });
    const isDuplicate = seenKeys.has(result.duplicateKey) || Boolean(existingDuplicate);

    await prisma.cleanedTextItem.create({
      data: {
        rawTextItemId: rawItem.id,
        ipoId: rawItem.ipoId,
        cleanedText: result.cleanedText,
        language: result.language,
        spamScore: result.spamScore,
        duplicateKey: result.duplicateKey,
        isDuplicate
      }
    });

    seenKeys.add(result.duplicateKey);
    cleaned += 1;
    if (isDuplicate) duplicates += 1;
  }

  return { cleaned, duplicates };
}
