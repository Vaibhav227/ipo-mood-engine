export function deriveSupabaseDirectUrl(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const usernameParts = parsed.username.split(".");
  const projectRef = usernameParts[1];

  if (!projectRef || !parsed.hostname.includes("pooler.supabase.com")) {
    return databaseUrl;
  }

  parsed.username = usernameParts[0];
  parsed.hostname = `db.${projectRef}.supabase.co`;
  parsed.port = "5432";
  parsed.search = "";
  return parsed.toString();
}
