import { requiredEnv } from "../../shared/src/env.js";

export type PineconeTextRecord = {
  id: string;
  text: string;
  metadata: Record<string, string | number | boolean | null>;
};

export async function upsertPineconeTextRecords(records: PineconeTextRecord[]) {
  if (records.length === 0) return 0;

  const host = requiredEnv("PINECONE_HOST");
  const namespace = process.env.PINECONE_NAMESPACE ?? "__default__";
  const textField = process.env.PINECONE_TEXT_FIELD ?? "chunk_text";
  const body = records
    .map((record) =>
      JSON.stringify({
        _id: record.id,
        [textField]: record.text,
        ...record.metadata
      })
    )
    .join("\n");

  const response = await fetch(`https://${host}/records/namespaces/${encodeURIComponent(namespace)}/upsert`, {
    method: "POST",
    headers: {
      "Api-Key": requiredEnv("PINECONE_API_KEY"),
      "Content-Type": "application/x-ndjson"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Pinecone integrated upsert failed: ${response.status} ${await response.text()}`);
  }

  return records.length;
}
