import { moodTaxonomy, narrativePhrases, type MoodCategory } from "./moodTaxonomy.js";

export type MoodInputItem = {
  text: string;
  source: string;
  timestamp?: string | null;
  likes?: number | null;
  spamScore: number;
};

export type MoodScoreResult = {
  scores: Record<MoodCategory, number>;
  topNarratives: Array<{ phrase: string; count: number }>;
  personality: string;
  summary: string;
};

const sourceWeight = (source: string) => {
  if (source === "news") return 1.05;
  if (source === "manual") return 1;
  if (source === "reddit") return 0.9;
  return 0.8;
};

const recencyWeight = (timestamp?: string | null) => {
  if (!timestamp) return 0.75;

  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 1) return 1;
  if (ageDays <= 3) return 0.8;
  if (ageDays <= 7) return 0.55;
  return 0.3;
};

const engagementWeight = (likes?: number | null) => {
  if (!likes || likes <= 0) return 1;
  return Math.min(1.35, 1 + Math.log10(likes + 1) / 10);
};

const phraseCount = (text: string, phrase: string) => {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.match(new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "gi"));
  return matches?.length ?? 0;
};

const scoreTextForMood = (item: MoodInputItem, key: MoodCategory) => {
  const definition = moodTaxonomy.find((mood) => mood.key === key);
  if (!definition) return 0;

  const normalized = item.text.toLowerCase();
  const hits = definition.phrases.reduce((sum, phrase) => sum + phraseCount(normalized, phrase), 0);
  if (hits === 0) return 0;

  const base = Math.min(3, hits) * 22 * definition.weight;
  const confidence = 1 - Math.min(item.spamScore, 1);
  return base * sourceWeight(item.source) * recencyWeight(item.timestamp) * engagementWeight(item.likes) * confidence;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const choosePersonality = (scores: Record<MoodCategory, number>) => {
  if (scores.fomo_frenzy >= 60 && scores.valuation_concern >= 45) return "Hype-driven retail momentum with valuation anxiety";
  if (scores.listing_gain_expectation >= 45 && scores.operator_hype >= 35) return "Listing-gain narrative with hype risk";
  if (scores.listing_gain_expectation >= 40 && scores.valuation_concern >= 10) return "Listing-gain excitement with valuation watch";
  if (scores.listing_gain_expectation >= 35) return "Grey-market led listing-gain mood";
  if (scores.institutional_confidence >= 50 && scores.fomo_frenzy < 45) return "Silent institutional confidence with moderate public excitement";
  if (scores.low_conviction >= 45 && scores.confusion >= 35) return "Unclear demand with low conviction";
  if (scores.long_term_belief >= 50 && scores.valuation_concern < 45) return "Fundamental long-term belief story";
  return "Mixed IPO mood with developing narratives";
};

const buildSummary = (scores: Record<MoodCategory, number>, personality: string) => {
  const strongest = Object.entries(scores)
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key, value]) => `${key.replace(/_/g, " ")} ${value}`);

  if (strongest.length === 0) {
    return "Discussion volume is too limited to form a confident IPO mood yet.";
  }

  return `${personality}. Strongest current signals: ${strongest.join(", ")}.`;
};

export function scoreMood(items: MoodInputItem[]): MoodScoreResult {
  const rawScores = Object.fromEntries(moodTaxonomy.map((definition) => [definition.key, 0])) as Record<MoodCategory, number>;
  const narrativeCounts = new Map<string, number>();

  for (const item of items) {
    for (const definition of moodTaxonomy) {
      rawScores[definition.key] += scoreTextForMood(item, definition.key);
    }

    const normalized = item.text.toLowerCase();
    for (const phrase of narrativePhrases) {
      const count = phraseCount(normalized, phrase);
      if (count > 0) {
        narrativeCounts.set(phrase, (narrativeCounts.get(phrase) ?? 0) + count);
      }
    }
  }

  const divisor = Math.max(1, Math.sqrt(items.length));
  const scores = Object.fromEntries(
    Object.entries(rawScores).map(([key, value]) => [key, clampScore(value / divisor)])
  ) as Record<MoodCategory, number>;

  const topNarratives = Array.from(narrativeCounts.entries())
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const personality = choosePersonality(scores);
  const summary = buildSummary(scores, personality);

  return {
    scores,
    topNarratives,
    personality,
    summary
  };
}
