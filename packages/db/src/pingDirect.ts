import "dotenv/config";
import { deriveSupabaseDirectUrl } from "./directUrl.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

process.env.DATABASE_URL = deriveSupabaseDirectUrl(databaseUrl);

const { databaseUrlSummary } = await import("./databaseUrlSummary.js");
const { prisma } = await import("./client.js");
const { runDbScript } = await import("./runDbScript.js");
const { withTimeout } = await import("./withTimeout.js");

async function main() {
  console.log("Direct database URL summary:");
  console.log(databaseUrlSummary());
  console.log("Pinging direct database...");
  const startedAt = Date.now();
  await withTimeout(prisma.$queryRaw`SELECT 1`, "Direct database ping", 15000);
  console.log(`Direct database ping OK in ${Date.now() - startedAt}ms`);
}

runDbScript(main);
