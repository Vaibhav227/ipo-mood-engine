import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { databaseUrlSummary } from "./databaseUrlSummary.js";
import { prisma } from "./client.js";
import { runDbScript } from "./runDbScript.js";
import { withTimeout } from "./withTimeout.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const migrationPath = path.join(repoRoot, "packages/db/prisma/migrations/20260508000000_initial/migration.sql");

const ignorableMessages = [
  "already exists",
  "multiple primary keys for table",
  "constraint",
  "already exists"
];

function splitSqlStatements(sql: string) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  console.log("Database URL summary:");
  console.log(databaseUrlSummary());
  console.log("Checking database connection...");
  await withTimeout(prisma.$queryRaw`SELECT 1`, "Database connection", 10000);
  console.log("Database connection OK");

  const sql = await readFile(migrationPath, "utf8");
  const statements = splitSqlStatements(sql);
  console.log(`Applying ${statements.length} SQL statements...`);

  let applied = 0;
  let skipped = 0;

  for (const [index, statement] of statements.entries()) {
    try {
      await withTimeout(prisma.$executeRawUnsafe(statement), `SQL statement ${index + 1}`, 10000);
      applied += 1;
      console.log(`Applied statement ${index + 1}/${statements.length}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const canSkip = ignorableMessages.some((text) => message.toLowerCase().includes(text));
      if (!canSkip) {
        throw error;
      }

      skipped += 1;
      console.log(`Skipped existing statement ${index + 1}/${statements.length}`);
    }
  }

  console.log(`Schema apply complete: ${applied} applied, ${skipped} skipped`);
}

runDbScript(main);
