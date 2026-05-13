export function databaseUrlSummary() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return "DATABASE_URL is not set";
  }

  try {
    const parsed = new URL(databaseUrl);
    return JSON.stringify(
      {
        protocol: parsed.protocol,
        username: parsed.username || "(missing)",
        passwordSet: Boolean(parsed.password),
        host: parsed.hostname,
        port: parsed.port || "(missing)",
        database: parsed.pathname.slice(1) || "(missing)",
        search: parsed.search || "(none)"
      },
      null,
      2
    );
  } catch (error) {
    return `DATABASE_URL is invalid: ${error instanceof Error ? error.message : String(error)}`;
  }
}
