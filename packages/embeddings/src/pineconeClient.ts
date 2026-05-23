import { requiredEnv } from "../../shared/src/env.js";

export type PineconeTextRecord = {
  id: string;
  text: string;
  metadata: Record<string, string | number | boolean | null>;
};

type PineconeEmbedResponse = {
  data: Array<{
    values: number[];
  }>;
};

async function embedWithPinecone(records: PineconeTextRecord[]) {
  const response = await fetch("https://api.pinecone.io/embed", {
    method: "POST",
    headers: {
      "Api-Key": requiredEnv("PINECONE_API_KEY"),
      "Content-Type": "application/json",
      "X-Pinecone-Api-Version": "2025-10"
    },
    body: JSON.stringify({
      model: process.env.PINECONE_EMBED_MODEL ?? "llama-text-embed-v2",
      parameters: {
        input_type: "passage",
        truncate: "END"
      },
      inputs: records.map((record) => ({ text: record.text }))
    })
  });

  if (!response.ok) {
    throw new Error(`Pinecone embed failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as PineconeEmbedResponse;
  if (payload.data.length !== records.length) {
    throw new Error(`Pinecone embed returned ${payload.data.length} vectors for ${records.length} records`);
  }

  return payload.data.map((item) => item.values);
}

export async function upsertPineconeTextRecords(records: PineconeTextRecord[]) {
  if (records.length === 0) return 0;

  const host = requiredEnv("PINECONE_HOST").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const namespace = process.env.PINECONE_NAMESPACE?.trim();
  const vectors = await embedWithPinecone(records);

  const response = await fetch(`https://${host}/vectors/upsert`, {
    method: "POST",
    headers: {
      "Api-Key": requiredEnv("PINECONE_API_KEY"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...(namespace ? { namespace } : {}),
      vectors: records.map((record, index) => ({
        id: record.id,
        values: vectors[index],
        metadata: {
          ...record.metadata,
          text: record.text
        }
      }))
    })
  });

  if (!response.ok) {
    throw new Error(`Pinecone vector upsert failed: ${response.status} ${await response.text()}`);
  }

  return records.length;
}
