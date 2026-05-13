import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CollectedTextItem, IpoMatchCandidate } from "../../shared/src/types.js";
import { matchIpo } from "./ipoMatcher.js";

type ManualTextItem = {
  ipo?: string;
  sourceUrl?: string;
  text: string;
  author?: string;
  timestamp?: string;
  likes?: number;
  metadata?: Record<string, unknown>;
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const defaultImportPath = path.join(repoRoot, "data/import/manual-text-items.json");

function manualExternalId(item: ManualTextItem) {
  const stableValue = [item.sourceUrl, item.ipo, item.text, item.timestamp].filter(Boolean).join("|");
  return `manual:${createHash("sha256").update(stableValue).digest("hex")}`;
}

export async function collectManualItems(
  ipos: IpoMatchCandidate[],
  importPath = process.env.MANUAL_IMPORT_PATH ?? defaultImportPath
): Promise<CollectedTextItem[]> {
  let rawContents: string;
  try {
    rawContents = await readFile(importPath, "utf8");
  } catch {
    return [];
  }

  const manualItems = JSON.parse(rawContents) as ManualTextItem[];

  return manualItems
    .filter((item) => item.text?.trim())
    .map((item) => {
      const matchText = [item.ipo, item.text].filter(Boolean).join(" ");
      const match = matchIpo(matchText, ipos);

      return {
        ipoId: match.status === "matched" ? match.ipo?.id : undefined,
        source: "manual" as const,
        sourceUrl: item.sourceUrl,
        externalId: manualExternalId(item),
        rawText: item.text,
        author: item.author,
        timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
        likes: item.likes,
        metadata: {
          ...item.metadata,
          importPath,
          matchedAliases: match.matchedAliases
        },
        matchStatus: match.status
      };
    });
}
