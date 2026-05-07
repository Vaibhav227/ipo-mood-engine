import { describe, expect, it } from "vitest";
import type { PineconeTextRecord } from "../packages/embeddings/src/pineconeClient.js";

describe("Pinecone vector metadata", () => {
  it("supports Week 1 metadata shape", () => {
    const vector: PineconeTextRecord = {
      id: "reddit:cleaned_123",
      text: "ather ipo looks hot but valuation is stretched",
      metadata: {
        ipo_id: "ipo_123",
        ipo_slug: "ather-energy",
        ipo_name: "Ather Energy",
        source: "reddit",
        timestamp: 171234234,
        text_item_id: "cleaned_123",
        likes: 120,
        spam_score: 0.12
      }
    };

    expect(vector.id).toBe("reddit:cleaned_123");
    expect(vector.text).toContain("ather ipo");
    expect(vector.metadata.ipo_slug).toBe("ather-energy");
    expect(vector.metadata.spam_score).toBe(0.12);
  });
});
