import type { IpoMatchCandidate, IpoMatchResult } from "../../shared/src/types.js";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function matchIpo(text: string, ipos: IpoMatchCandidate[]): IpoMatchResult {
  const normalized = text.toLowerCase();
  const matches: Array<{ ipo: IpoMatchCandidate; aliases: string[]; bestLength: number }> = [];

  for (const ipo of ipos) {
    const aliases = [ipo.name, ...ipo.aliases]
      .map((alias) => alias.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const matchedAliases = aliases.filter((alias) => {
      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias.toLowerCase())}([^a-z0-9]|$)`, "i");
      return pattern.test(normalized);
    });

    if (matchedAliases.length > 0) {
      matches.push({
        ipo,
        aliases: matchedAliases,
        bestLength: Math.max(...matchedAliases.map((alias) => alias.length))
      });
    }
  }

  if (matches.length === 0) {
    return { status: "unmatched", matchedAliases: [] };
  }

  if (matches.length > 1) {
    return {
      status: "ambiguous",
      matchedAliases: matches.flatMap((match) => match.aliases)
    };
  }

  return {
    status: "matched",
    ipo: matches[0].ipo,
    matchedAliases: matches[0].aliases
  };
}
