export type SeedIpo = {
  name: string;
  slug: string;
  aliases: string[];
  sector?: string;
  status: string;
  openDate?: string;
  closeDate?: string;
  listingDate?: string;
  exchange?: string;
};

export type IpoMatchCandidate = {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
};

export type MatchStatus = "matched" | "ambiguous" | "unmatched";

export type IpoMatchResult = {
  status: MatchStatus;
  ipo?: IpoMatchCandidate;
  matchedAliases: string[];
};

export type CollectedTextItem = {
  ipoId?: string;
  source: "reddit" | "news";
  sourceUrl?: string;
  externalId: string;
  rawText: string;
  author?: string;
  timestamp?: Date;
  likes?: number;
  commentsCount?: number;
  metadata?: Record<string, unknown>;
  matchStatus: MatchStatus;
};

export type CleanTextResult = {
  cleanedText: string;
  duplicateKey: string;
  language: string;
  spamScore: number;
};

export type PipelineSummary = {
  iposProcessed: number;
  rawItemsCollected: number;
  matchedItems: number;
  duplicatesSkipped: number;
  spamSkipped: number;
  embeddingsGenerated: number;
  pineconeUpserts: number;
  errors: number;
};
