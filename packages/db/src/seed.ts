import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { prisma } from "./client.js";
import type { SeedIpo } from "../../shared/src/types.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const seedPath = path.join(repoRoot, "data/seeds/ipos.json");

const parseOptionalDate = (value?: string | null) => (value ? new Date(value) : null);

async function main() {
  const contents = await readFile(seedPath, "utf8");
  const ipos = JSON.parse(contents) as SeedIpo[];

  for (const ipo of ipos) {
    await prisma.ipo.upsert({
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
    });
  }

  console.log(`Seeded ${ipos.length} IPOs`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
