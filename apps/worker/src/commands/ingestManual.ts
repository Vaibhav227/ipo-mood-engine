import "dotenv/config";
import { prisma } from "../../../../packages/db/src/client.js";
import { collectManualItems } from "../../../../packages/ingestion/src/manualImportCollector.js";
import { storeRawTextItems } from "../../../../packages/ingestion/src/rawTextStore.js";
import { loadIpoCandidates } from "../lib/loadIpos.js";

async function main() {
  const run = await prisma.ingestionRun.create({
    data: { source: "manual", status: "running" }
  });

  try {
    const ipos = await loadIpoCandidates(prisma);
    const items = await collectManualItems(ipos);
    const result = await storeRawTextItems(prisma, items);

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        iposProcessed: ipos.length,
        rawItemsCollected: result.collected,
        matchedItems: result.matched
      }
    });

    console.log(`Manual ingestion complete: ${result.collected} items, ${result.matched} matched`);
  } catch (error) {
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errors: 1,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      }
    });
    throw error;
  }
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
