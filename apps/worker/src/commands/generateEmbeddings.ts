import "dotenv/config";
import { prisma } from "../../../../packages/db/src/client.js";
import { databaseUrlSummary } from "../../../../packages/db/src/databaseUrlSummary.js";
import { runDbScript } from "../../../../packages/db/src/runDbScript.js";
import { generateAndStoreEmbeddings } from "../../../../packages/embeddings/src/embeddingProcessor.js";

async function main() {
  console.log("Database URL summary:");
  console.log(databaseUrlSummary());
  const result = await generateAndStoreEmbeddings(prisma);
  console.log(
    `Embeddings complete: ${result.embeddingsGenerated} generated, ${result.pineconeUpserts} Pinecone upserts`
  );
}

runDbScript(main);
