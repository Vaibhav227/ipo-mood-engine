import { describe, expect, it } from "vitest";
import { scoreMood } from "../packages/scoring/src/moodScorer.js";

const now = new Date().toISOString();

describe("scoreMood", () => {
  it("detects grey-market led listing-gain mood without treating GMP as operator hype", () => {
    const result = scoreMood([
      {
        text: "grey market premium is rising and listing gain expectation is strong",
        source: "news",
        timestamp: now,
        likes: 0,
        spamScore: 0
      },
      {
        text: "gmp premium indicates listing gain interest",
        source: "news",
        timestamp: now,
        likes: 0,
        spamScore: 0
      },
      {
        text: "grey market premium remains positive for this ipo",
        source: "news",
        timestamp: now,
        likes: 0,
        spamScore: 0
      }
    ]);

    expect(result.scores.listing_gain_expectation).toBeGreaterThan(35);
    expect(result.scores.operator_hype).toBe(0);
    expect(result.personality).toBe("Grey-market led listing-gain mood");
  });

  it("detects hype risk when pump-style language is present", () => {
    const result = scoreMood([
      {
        text: "listing gain looks strong with grey market premium",
        source: "manual",
        timestamp: now,
        likes: 10,
        spamScore: 0
      },
      {
        text: "telegram pump and operator hype around this ipo",
        source: "manual",
        timestamp: now,
        likes: 10,
        spamScore: 0
      },
      {
        text: "whatsapp forwarded message says guaranteed listing gain",
        source: "manual",
        timestamp: now,
        likes: 10,
        spamScore: 0
      }
    ]);

    expect(result.scores.operator_hype).toBeGreaterThanOrEqual(35);
    expect(result.personality).toBe("Listing-gain narrative with hype risk");
  });

  it("reduces stale signals with recency weighting", () => {
    const recent = scoreMood([
      {
        text: "grey market premium and listing gain are strong",
        source: "news",
        timestamp: now,
        likes: 0,
        spamScore: 0
      }
    ]);
    const stale = scoreMood([
      {
        text: "grey market premium and listing gain are strong",
        source: "news",
        timestamp: "2020-01-01T00:00:00.000Z",
        likes: 0,
        spamScore: 0
      }
    ]);

    expect(recent.scores.listing_gain_expectation).toBeGreaterThan(stale.scores.listing_gain_expectation);
  });

  it("creates a higher listing-gain meter for GMP-led momentum than long-term benefit", () => {
    const result = scoreMood([
      {
        text: "grey market premium is rising with strong listing gain expectation",
        source: "news",
        timestamp: now,
        likes: 0,
        spamScore: 0
      },
      {
        text: "retail fomo and listing pop demand remain strong",
        source: "manual",
        timestamp: now,
        likes: 8,
        spamScore: 0
      },
      {
        text: "valuation looks expensive but listing gains are expected",
        source: "news",
        timestamp: now,
        likes: 0,
        spamScore: 0
      }
    ]);

    expect(result.marketMeters.listing_gain_potential.score).toBeGreaterThan(
      result.marketMeters.long_term_benefit.score
    );
    expect(result.marketMeters.listing_gain_potential.verdict).toContain("Listing-gain");
  });

  it("creates a higher long-term benefit meter when conviction and fundamentals dominate", () => {
    const result = scoreMood([
      {
        text: "strong fundamentals and long term growth story with profitability",
        source: "news",
        timestamp: now,
        likes: 0,
        spamScore: 0
      },
      {
        text: "institutional qualified institutional buyer interest and anchor investor confidence",
        source: "news",
        timestamp: now,
        likes: 0,
        spamScore: 0
      },
      {
        text: "quality business model worth holding for long term",
        source: "manual",
        timestamp: now,
        likes: 4,
        spamScore: 0
      }
    ]);

    expect(result.marketMeters.long_term_benefit.score).toBeGreaterThan(
      result.marketMeters.listing_gain_potential.score
    );
    expect(result.marketMeters.long_term_benefit.verdict).toMatch(/Long-term|Promising/);
  });
});
