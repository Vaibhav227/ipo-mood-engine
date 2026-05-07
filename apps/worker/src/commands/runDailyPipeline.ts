import "dotenv/config";
import { prisma } from "../../../../packages/db/src/client.js";
import { collectNewsItems } from "../../../../packages/ingestion/src/newsCollector.js";
import { collectRedditItems } from "../../../../packages/ingestion/src/redditCollector.js";
import { storeRawTextItems } from "../../../../packages/ingestion/src/rawTextStore.js";
import { cleanStoredRawItems } from "../../../../packages/ingestion/src/cleaningProcessor.js";
import { generateAndStoreEmbeddings } from "../../../../packages/embeddings/src/embeddingProcessor.js";
import { loadIpoCandidates } from "../lib/loadIpos.js";
import { emptySummary, printSummary } from "../lib/runSummary.js";

async function main() {
  const summary = emptySummary();
  const run = await prisma.ingestionRun.create({
    data: { source: "daily_pipeline", status: "running" }
  });

  try {
    const ipos = await loadIpoCandidates(prisma);
    summary.iposProcessed = ipos.length;

    const redditItems = await collectRedditItems(ipos);
    const redditStored = await storeRawTextItems(prisma, redditItems);
    summary.rawItemsCollected += redditStored.collected;
    summary.matchedItems += redditStored.matched;

    const newsItems = await collectNewsItems(ipos);
    const newsStored = await storeRawTextItems(prisma, newsItems);
    summary.rawItemsCollected += newsStored.collected;
    summary.matchedItems += newsStored.matched;

    const cleaning = await cleanStoredRawItems(prisma);
    summary.duplicatesSkipped = cleaning.duplicates;

    const embeddings = await generateAndStoreEmbeddings(prisma);
    summary.embeddingsGenerated = embeddings.embeddingsGenerated;
    summary.pineconeUpserts = embeddings.pineconeUpserts;
    summary.spamSkipped = embeddings.spamSkipped;

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        ...summary
      }
    });

    printSummary(summary);
  } catch (error) {
    summary.errors += 1;
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        ...summary,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      }
    });
    printSummary(summary);
    throw error;
  }
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
