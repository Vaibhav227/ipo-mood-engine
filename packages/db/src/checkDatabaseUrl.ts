import "dotenv/config";

function mask(value: string) {
  return value.replace(/:\/\/([^:/@?#]+)?(:[^@/?#]*)?@/, "://$1:***@");
}

function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const parsed = new URL(databaseUrl);
  const problems: string[] = [];

  if (!["postgresql:", "postgres:"].includes(parsed.protocol)) {
    problems.push(`protocol should be postgresql:, got ${parsed.protocol}`);
  }

  if (!parsed.username) {
    problems.push("username is missing");
  }

  if (!parsed.password) {
    problems.push("password is missing");
  }

  if (!parsed.hostname.includes(".")) {
    problems.push(`hostname looks incomplete: ${parsed.hostname}`);
  }

  const port = Number.parseInt(parsed.port, 10);
  if (!parsed.port || ![5432, 6543].includes(port)) {
    problems.push(`port should usually be 5432 or 6543 for hosted Postgres, got ${parsed.port || "(missing)"}`);
  }

  if (parsed.pathname.length <= 1) {
    problems.push("database name/path is missing");
  }

  if (problems.length > 0) {
    console.error("DATABASE_URL looks invalid:");
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    console.error(`\nParsed URL: ${mask(databaseUrl)}`);
    process.exitCode = 1;
    return;
  }

  console.log("DATABASE_URL shape looks valid");
  console.log(
    JSON.stringify(
      {
        protocol: parsed.protocol,
        username: parsed.username,
        passwordSet: Boolean(parsed.password),
        host: parsed.hostname,
        port: parsed.port,
        database: parsed.pathname.slice(1),
        search: parsed.search
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
