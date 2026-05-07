import "dotenv/config";
import { prisma } from "../../../../packages/db/src/client.js";
import { cleanStoredRawItems } from "../../../../packages/ingestion/src/cleaningProcessor.js";

async function main() {
  const result = await cleanStoredRawItems(prisma);
  console.log(`Text cleaning complete: ${result.cleaned} cleaned, ${result.duplicates} duplicates`);
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
