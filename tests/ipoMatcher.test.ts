import { describe, expect, it } from "vitest";
import { matchIpo } from "../packages/ingestion/src/ipoMatcher.js";
import type { IpoMatchCandidate } from "../packages/shared/src/types.js";

const ipos: IpoMatchCandidate[] = [
  {
    id: "ipo_ather",
    name: "Ather Energy",
    slug: "ather-energy",
    aliases: ["Ather", "Ather IPO", "Ather Energy IPO"]
  },
  {
    id: "ipo_belrise",
    name: "Belrise Industries",
    slug: "belrise-industries",
    aliases: ["Belrise", "Belrise IPO"]
  }
];

describe("matchIpo", () => {
  it("matches by IPO alias case-insensitively", () => {
    const result = matchIpo("Is ATHER IPO good for listing gains?", ipos);

    expect(result.status).toBe("matched");
    expect(result.ipo?.slug).toBe("ather-energy");
  });

  it("returns unmatched when no seeded IPO appears", () => {
    const result = matchIpo("Upcoming IPO market looks very hot this week", ipos);

    expect(result.status).toBe("unmatched");
  });

  it("returns ambiguous when multiple IPOs have equally strong matches", () => {
    const result = matchIpo("Ather IPO and Belrise IPO both have strong GMP chatter", ipos);

    expect(result.status).toBe("ambiguous");
  });
});
