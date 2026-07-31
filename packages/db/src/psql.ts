import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function psqlBin() {
  return process.env.PSQL_BIN ?? "psql";
}

function cleanDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl.replace(/\?.*$/, "");
}

export async function psqlJson<T>(sql: string): Promise<T> {
  const { stdout } = await execFileAsync(
    psqlBin(),
    [cleanDatabaseUrl(), "-t", "-A", "-c", sql],
    {
      maxBuffer: 1024 * 1024 * 20
    }
  );

  const trimmed = stdout.trim();
  return JSON.parse(trimmed || "null") as T;
}

export async function psqlExec(sql: string) {
  await execFileAsync(psqlBin(), [cleanDatabaseUrl(), "-v", "ON_ERROR_STOP=1", "-c", sql], {
    maxBuffer: 1024 * 1024 * 20
  });
}

export function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}
