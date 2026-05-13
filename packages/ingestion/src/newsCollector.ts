import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { optionalBooleanEnv, optionalIntEnv } from "../../shared/src/env.js";
import type { CollectedTextItem, IpoMatchCandidate } from "../../shared/src/types.js";
import { matchIpo } from "./ipoMatcher.js";

type GoogleNewsItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  source?: {
    "#text"?: string;
  };
  description?: string;
};

type GoogleNewsFeed = {
  rss?: {
    channel?: {
      item?: GoogleNewsItem[] | GoogleNewsItem;
    };
  };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true
});

function canonicalNewsId(url: string) {
  return `news:${createHash("sha256").update(url).digest("hex")}`;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildQueries(ipo: IpoMatchCandidate) {
  const includeSourceSearch = optionalBooleanEnv("PIPELINE_NEWS_INCLUDE_SOURCE_SEARCH", true);
  const sourceSites = ["livemint.com", "moneycontrol.com", "cnbctv18.com", "business-standard.com", "economictimes.indiatimes.com"];
  const aliasQueries = [
    `${ipo.name} IPO India`,
    `${ipo.name} GMP`,
    `${ipo.name} subscription`
  ];

  if (includeSourceSearch) {
    aliasQueries.push(...sourceSites.map((site) => `${ipo.name} IPO site:${site}`));
  }

  return Array.from(new Set(aliasQueries));
}

async function fetchWithTimeout(url: URL, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function collectNewsItems(ipos: IpoMatchCandidate[]): Promise<CollectedTextItem[]> {
  const maxNewsPerIpo = optionalIntEnv("PIPELINE_MAX_NEWS_PER_IPO", 10);
  const timeoutMs = optionalIntEnv("PIPELINE_NEWS_FETCH_TIMEOUT_MS", 8000);
  const items: CollectedTextItem[] = [];

  for (const ipo of ipos) {
    const queries = buildQueries(ipo);
    console.log(`Collecting news for ${ipo.slug}: ${queries.length} queries`);

    for (const [queryIndex, query] of queries.entries()) {
      const url = new URL("https://news.google.com/rss/search");
      url.searchParams.set("q", query);
      url.searchParams.set("hl", "en-IN");
      url.searchParams.set("gl", "IN");
      url.searchParams.set("ceid", "IN:en");

      let response: Response;
      try {
        response = await fetchWithTimeout(url, timeoutMs);
      } catch (error) {
        console.warn(`News query timed out for ${ipo.slug} (${queryIndex + 1}/${queries.length}): ${query}`);
        continue;
      }

      if (!response.ok) {
        console.warn(`Google News RSS failed for ${query}: ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const feed = parser.parse(xml) as GoogleNewsFeed;
      const feedItems = feed.rss?.channel?.item
        ? Array.isArray(feed.rss.channel.item)
          ? feed.rss.channel.item
          : [feed.rss.channel.item]
        : [];

      for (const news of feedItems.slice(0, maxNewsPerIpo)) {
        const title = news.title?.trim();
        const link = news.link?.trim();
        if (!title || !link) continue;

        const snippet = news.description ? stripHtml(news.description) : "";
        const rawText = [title, snippet].filter(Boolean).join("\n\n");
        const match = matchIpo(rawText, ipos);

        items.push({
          ipoId: match.status === "matched" ? match.ipo?.id : undefined,
          source: "news",
          sourceUrl: link,
          externalId: canonicalNewsId(link),
          rawText,
          author: news.source?.["#text"],
          timestamp: news.pubDate ? new Date(news.pubDate) : undefined,
          metadata: {
            query,
            headline: title,
            sourceName: news.source?.["#text"],
            matchedAliases: match.matchedAliases
          },
          matchStatus: match.status
        });
      }
    }

    console.log(`Collected ${items.filter((item) => item.ipoId === ipo.id).length} matched news items for ${ipo.slug}`);
  }

  return items;
}
