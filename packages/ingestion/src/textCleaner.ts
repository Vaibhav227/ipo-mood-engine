import { createHash } from "node:crypto";
import type { CleanTextResult } from "../../shared/src/types.js";

const slangMap: Array<[RegExp, string]> = [
  [/\bgmp\b/gi, "grey market premium"],
  [/\bhni\b/gi, "high net worth investor"],
  [/\bnii\b/gi, "non institutional investor"],
  [/\bqib\b/gi, "qualified institutional buyer"],
  [/\brhp\b/gi, "red herring prospectus"],
  [/\bdrhp\b/gi, "draft red herring prospectus"]
];

const emojiMap: Array<[RegExp, string]> = [
  [/🚀/gu, " bullish "],
  [/🔥/gu, " hot "],
  [/💰/gu, " profit "],
  [/📉/gu, " bearish "],
  [/📈/gu, " bullish "]
];

const promotionalPhrases = [
  "sure shot listing gain",
  "guaranteed profit",
  "upper circuit guaranteed",
  "join telegram",
  "dm for calls",
  "100% profit",
  "multibagger guaranteed"
];

export function cleanText(rawText: string): CleanTextResult {
  const urlCount = (rawText.match(/https?:\/\/\S+|www\.\S+/gi) ?? []).length;
  const emojiCount = (rawText.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? []).length;
  const originalLength = rawText.trim().length;

  let cleanedText = rawText;
  for (const [emoji, replacement] of emojiMap) {
    cleanedText = cleanedText.replace(emoji, replacement);
  }

  cleanedText = cleanedText
    .toLowerCase()
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/[!?.,]{2,}/g, " ")
    .replace(/[^\p{L}\p{N}\s%₹$+-]/gu, " ");

  for (const [pattern, replacement] of slangMap) {
    cleanedText = cleanedText.replace(pattern, replacement);
  }

  cleanedText = cleanedText.replace(/\s+/g, " ").trim();

  const duplicateKey = createHash("sha256").update(cleanedText).digest("hex");
  const promotionalHits = promotionalPhrases.filter((phrase) => cleanedText.includes(phrase)).length;
  const veryShortHype = cleanedText.length < 24 && /\b(buy|apply|hot|bullish|profit)\b/.test(cleanedText);
  const forwardedStyle = /(forwarded|copy paste|telegram|whatsapp)/i.test(rawText);
  const emojiDensity = originalLength > 0 ? emojiCount / originalLength : 0;

  let spamScore = 0;
  spamScore += Math.min(urlCount * 0.18, 0.36);
  spamScore += Math.min(promotionalHits * 0.24, 0.48);
  spamScore += emojiDensity > 0.08 ? 0.22 : 0;
  spamScore += veryShortHype ? 0.2 : 0;
  spamScore += forwardedStyle ? 0.22 : 0;
  spamScore = Math.min(Number(spamScore.toFixed(2)), 1);

  return {
    cleanedText,
    duplicateKey,
    language: "en",
    spamScore
  };
}
