import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
function cleanDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not set");
    }
    return databaseUrl.replace(/\?.*$/, "");
}
export async function psqlJson(sql) {
    const { stdout } = await execFileAsync("/opt/homebrew/bin/psql", [cleanDatabaseUrl(), "-t", "-A", "-c", sql], {
        maxBuffer: 1024 * 1024 * 20
    });
    const trimmed = stdout.trim();
    return JSON.parse(trimmed || "null");
}
export async function psqlExec(sql) {
    await execFileAsync("/opt/homebrew/bin/psql", [cleanDatabaseUrl(), "-v", "ON_ERROR_STOP=1", "-c", sql], {
        maxBuffer: 1024 * 1024 * 20
    });
}
export function sqlString(value) {
    return `'${value.replace(/'/g, "''")}'`;
}
