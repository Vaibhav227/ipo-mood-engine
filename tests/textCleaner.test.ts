import { describe, expect, it } from "vitest";
import { cleanText } from "../packages/ingestion/src/textCleaner.js";

describe("cleanText", () => {
  it("normalizes IPO abbreviations and emojis", () => {
    const result = cleanText("HNI oversubscription is insane 🚀🚀 GMP up!");

    expect(result.cleanedText).toContain("high net worth investor");
    expect(result.cleanedText).toContain("grey market premium");
    expect(result.cleanedText).toContain("bullish");
  });

  it("removes URLs and creates stable duplicate keys", () => {
    const first = cleanText("Ather IPO looks hot https://example.com");
    const second = cleanText("Ather IPO looks hot");

    expect(first.cleanedText).toBe("ather ipo looks hot");
    expect(first.duplicateKey).toBe(second.duplicateKey);
  });

  it("scores obvious promotional spam higher", () => {
    const result = cleanText("Sure shot listing gain 🚀🚀🚀 join telegram https://example.com");

    expect(result.spamScore).toBeGreaterThanOrEqual(0.75);
  });
});
