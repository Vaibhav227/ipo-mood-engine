const scoreLabels: Record<string, string> = {
  fomo_frenzy: "FOMO",
  cautious_optimism: "cautious optimism",
  blind_hype: "blind hype",
  confusion: "confusion",
  panic: "panic",
  conviction_buying: "conviction buying",
  institutional_confidence: "institutional confidence",
  valuation_concern: "valuation concern",
  low_conviction: "low conviction",
  operator_hype: "operator hype",
  listing_gain_expectation: "listing gain chatter",
  long_term_belief: "long-term belief"
};

type MeterBand = "very_strong" | "strong" | "moderate" | "low";

type MeterDriver = {
  key: string;
  label: string;
  value: number;
};

export type MarketMeter = {
  key: string;
  label: string;
  score: number;
  band: MeterBand;
  verdict: string;
  reason: string;
  positiveDrivers: MeterDriver[];
  riskDrivers: MeterDriver[];
};

export type MarketMeters = {
  listing_gain_potential: MarketMeter;
  long_term_benefit: MarketMeter;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const bandForScore = (score: number): MeterBand => {
  if (score >= 80) return "very_strong";
  if (score >= 60) return "strong";
  if (score >= 35) return "moderate";
  return "low";
};

const topDrivers = (scores: Record<string, number>, weights: Record<string, number>, minContribution = 2) =>
  Object.entries(weights)
    .map(([key, weight]) => {
      const value = scores[key] ?? 0;
      return {
        key,
        label: scoreLabels[key] ?? key,
        value,
        contribution: value * Math.abs(weight ?? 0)
      };
    })
    .filter((driver) => driver.contribution >= minContribution)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(({ contribution: _contribution, ...driver }) => driver);

const weightedScore = (scores: Record<string, number>, positives: Record<string, number>, risks: Record<string, number>) => {
  const positiveScore = Object.entries(positives).reduce(
    (sum, [key, weight]) => sum + (scores[key] ?? 0) * (weight ?? 0),
    0
  );
  const riskPenalty = Object.entries(risks).reduce(
    (sum, [key, weight]) => sum + (scores[key] ?? 0) * (weight ?? 0),
    0
  );
  return clamp(positiveScore - riskPenalty);
};

const listingVerdict = (score: number) => {
  if (score >= 80) return "Very high listing-gain setup";
  if (score >= 60) return "Strong listing-gain setup";
  if (score >= 35) return "Listing-gain watchlist";
  return "Weak listing-gain setup";
};

const longTermVerdict = (score: number) => {
  if (score >= 80) return "High long-term conviction";
  if (score >= 60) return "Promising long-term case";
  if (score >= 35) return "Long-term case still forming";
  return "Weak long-term signal";
};

const driverText = (drivers: MeterDriver[]) => {
  if (drivers.length === 0) return "no strong positive driver";
  return drivers.map((driver) => `${driver.label} ${driver.value}`).join(", ");
};

const riskText = (drivers: MeterDriver[]) => {
  if (drivers.length === 0) return "no major risk driver";
  return drivers.map((driver) => `${driver.label} ${driver.value}`).join(", ");
};

export function calculateMarketMeters(scores: Record<string, number>): MarketMeters {
  const listingPositives = {
    listing_gain_expectation: 0.62,
    fomo_frenzy: 0.14,
    institutional_confidence: 0.12,
    cautious_optimism: 0.07,
    conviction_buying: 0.05
  };
  const listingRisks = {
    operator_hype: 0.22,
    panic: 0.2,
    low_conviction: 0.18,
    valuation_concern: 0.12,
    confusion: 0.08
  };
  const longTermPositives = {
    long_term_belief: 0.38,
    conviction_buying: 0.26,
    institutional_confidence: 0.2,
    cautious_optimism: 0.1,
    valuation_concern: 0.06
  };
  const longTermRisks = {
    operator_hype: 0.22,
    blind_hype: 0.2,
    panic: 0.18,
    low_conviction: 0.16,
    confusion: 0.08,
    listing_gain_expectation: 0.06
  };

  const listingScore = weightedScore(scores, listingPositives, listingRisks);
  const listingPositiveDrivers = topDrivers(scores, listingPositives);
  const listingRiskDrivers = topDrivers(scores, listingRisks);
  const longTermScore = weightedScore(scores, longTermPositives, longTermRisks);
  const longTermPositiveDrivers = topDrivers(scores, longTermPositives);
  const longTermRiskDrivers = topDrivers(scores, longTermRisks);

  return {
    listing_gain_potential: {
      key: "listing_gain_potential",
      label: "Listing Gain Potential",
      score: listingScore,
      band: bandForScore(listingScore),
      verdict: listingVerdict(listingScore),
      reason: `Driven by ${driverText(listingPositiveDrivers)}; checked against ${riskText(listingRiskDrivers)}.`,
      positiveDrivers: listingPositiveDrivers,
      riskDrivers: listingRiskDrivers
    },
    long_term_benefit: {
      key: "long_term_benefit",
      label: "Long Term Benefit",
      score: longTermScore,
      band: bandForScore(longTermScore),
      verdict: longTermVerdict(longTermScore),
      reason: `Driven by ${driverText(longTermPositiveDrivers)}; checked against ${riskText(longTermRiskDrivers)}.`,
      positiveDrivers: longTermPositiveDrivers,
      riskDrivers: longTermRiskDrivers
    }
  };
}
