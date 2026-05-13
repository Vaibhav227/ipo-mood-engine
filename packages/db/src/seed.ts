import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { prisma } from "./client.js";
import { databaseUrlSummary } from "./databaseUrlSummary.js";
import { runDbScript } from "./runDbScript.js";
import { withTimeout } from "./withTimeout.js";
import type { SeedIpo } from "../../shared/src/types.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const seedPath = path.join(repoRoot, "data/seeds/ipos.json");

const parseOptionalDate = (value?: string | null) => (value ? new Date(value) : null);

async function main() {
  console.log("Database URL summary:");
  console.log(databaseUrlSummary());
  console.log("Checking database connection...");
  await withTimeout(prisma.$queryRaw`SELECT 1`, "Database connection", 10000);
  console.log("Database connection OK");

  const contents = await readFile(seedPath, "utf8");
  const ipos = JSON.parse(contents) as SeedIpo[];
  console.log(`Loaded ${ipos.length} IPO seed records`);

  for (const ipo of ipos) {
    console.log(`Seeding ${ipo.slug}...`);
    await withTimeout(
      prisma.ipo.upsert({
        where: { slug: ipo.slug },
        update: {
          name: ipo.name,
          aliases: ipo.aliases,
          sector: ipo.sector,
          status: ipo.status,
          openDate: parseOptionalDate(ipo.openDate),
          closeDate: parseOptionalDate(ipo.closeDate),
          listingDate: parseOptionalDate(ipo.listingDate),
          exchange: ipo.exchange
        },
        create: {
          name: ipo.name,
          slug: ipo.slug,
          aliases: ipo.aliases,
          sector: ipo.sector,
          status: ipo.status,
          openDate: parseOptionalDate(ipo.openDate),
          closeDate: parseOptionalDate(ipo.closeDate),
          listingDate: parseOptionalDate(ipo.listingDate),
          exchange: ipo.exchange
        }
      }),
      `Seed ${ipo.slug}`,
      10000
    );
  }

  console.log(`Seeded ${ipos.length} IPOs`);
}

runDbScript(main);
