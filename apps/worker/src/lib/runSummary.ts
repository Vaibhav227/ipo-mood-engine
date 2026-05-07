import type { PipelineSummary } from "../../../../packages/shared/src/types.js";

export function emptySummary(): PipelineSummary {
  return {
    iposProcessed: 0,
    rawItemsCollected: 0,
    matchedItems: 0,
    duplicatesSkipped: 0,
    spamSkipped: 0,
    embeddingsGenerated: 0,
    pineconeUpserts: 0,
    errors: 0
  };
}

export function printSummary(summary: PipelineSummary) {
  console.log("");
  console.log("Run complete");
  console.log("");
  console.log(`IPOs processed: ${summary.iposProcessed}`);
  console.log(`Raw items collected: ${summary.rawItemsCollected}`);
  console.log(`Matched items: ${summary.matchedItems}`);
  console.log(`Duplicates skipped: ${summary.duplicatesSkipped}`);
  console.log(`Spam skipped: ${summary.spamSkipped}`);
  console.log(`Embeddings generated: ${summary.embeddingsGenerated}`);
  console.log(`Pinecone upserts: ${summary.pineconeUpserts}`);
  console.log(`Errors: ${summary.errors}`);
}
