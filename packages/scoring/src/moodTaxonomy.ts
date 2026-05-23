export type MoodCategory =
  | "fomo_frenzy"
  | "cautious_optimism"
  | "blind_hype"
  | "confusion"
  | "panic"
  | "conviction_buying"
  | "institutional_confidence"
  | "valuation_concern"
  | "low_conviction"
  | "operator_hype"
  | "listing_gain_expectation"
  | "long_term_belief";

export type MoodDefinition = {
  key: MoodCategory;
  label: string;
  phrases: string[];
  weight: number;
};

export const moodTaxonomy: MoodDefinition[] = [
  {
    key: "fomo_frenzy",
    label: "FOMO frenzy",
    weight: 1.15,
    phrases: ["fomo", "oversubscribed", "huge demand", "retail rush", "crazy demand", "hot ipo", "insane demand"]
  },
  {
    key: "cautious_optimism",
    label: "Cautious optimism",
    weight: 1,
    phrases: ["cautious optimism", "looks good", "decent ipo", "positive but", "good company", "wait and watch"]
  },
  {
    key: "blind_hype",
    label: "Blind hype",
    weight: 1.15,
    phrases: ["sure shot", "guaranteed", "must apply", "do not miss", "multibagger", "upper circuit", "jackpot"]
  },
  {
    key: "confusion",
    label: "Confusion",
    weight: 0.9,
    phrases: ["confused", "not sure", "should i apply", "any views", "worth applying", "need advice"]
  },
  {
    key: "panic",
    label: "Panic",
    weight: 1.05,
    phrases: ["avoid", "panic", "bad ipo", "risky", "weak listing", "loss", "crash", "bearish"]
  },
  {
    key: "conviction_buying",
    label: "Conviction buying",
    weight: 1.05,
    phrases: ["long term", "strong fundamentals", "hold", "quality business", "growth story", "conviction"]
  },
  {
    key: "institutional_confidence",
    label: "Institutional confidence",
    weight: 1.1,
    phrases: ["qib", "anchor investor", "institutional", "qualified institutional buyer", "mutual fund", "foreign investor"]
  },
  {
    key: "valuation_concern",
    label: "Valuation concern",
    weight: 1.2,
    phrases: ["valuation", "expensive", "overvalued", "high pe", "p/e", "priced aggressively", "rich valuation"]
  },
  {
    key: "low_conviction",
    label: "Low conviction",
    weight: 1,
    phrases: ["low confidence", "weak demand", "tepid", "muted", "quiet", "not interested", "poor response"]
  },
  {
    key: "operator_hype",
    label: "Operator hype",
    weight: 1.2,
    phrases: ["operator", "pump", "telegram", "whatsapp", "forwarded", "fake hype", "manipulated", "grey market"]
  },
  {
    key: "listing_gain_expectation",
    label: "Listing gain expectation",
    weight: 1.1,
    phrases: ["listing gain", "listing gains", "grey market premium", "gmp", "premium", "listing pop"]
  },
  {
    key: "long_term_belief",
    label: "Long-term belief",
    weight: 1,
    phrases: ["long term", "fundamentals", "business model", "growth", "profitability", "market leader", "sector tailwind"]
  }
];

export const narrativePhrases = [
  "listing gain",
  "grey market premium",
  "valuation",
  "subscription",
  "retail demand",
  "qib demand",
  "anchor investor",
  "long term",
  "growth",
  "profitability",
  "overvalued",
  "weak demand",
  "strong demand"
];
