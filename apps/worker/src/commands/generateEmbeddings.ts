import "dotenv/config";
import { prisma } from "../../../../packages/db/src/client.js";
import { generateAndStoreEmbeddings } from "../../../../packages/embeddings/src/embeddingProcessor.js";

async function main() {
  const result = await generateAndStoreEmbeddings(prisma);
  console.log(
    `Embeddings complete: ${result.embeddingsGenerated} generated, ${result.pineconeUpserts} Pinecone upserts`
  );
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
