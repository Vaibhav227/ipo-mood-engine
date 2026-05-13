import "dotenv/config";
import { prisma } from "./client.js";
import { databaseUrlSummary } from "./databaseUrlSummary.js";
import { runDbScript } from "./runDbScript.js";
import { withTimeout } from "./withTimeout.js";

async function main() {
  console.log("Database URL summary:");
  console.log(databaseUrlSummary());
  console.log("Pinging database...");
  const startedAt = Date.now();
  await withTimeout(prisma.$queryRaw`SELECT 1`, "Database ping", 10000);
  console.log(`Database ping OK in ${Date.now() - startedAt}ms`);
}

runDbScript(main);
