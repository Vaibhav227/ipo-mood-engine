import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { optionalIntEnv } from "../../shared/src/env.js";
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
  return Array.from(new Set([ipo.name, ...ipo.aliases].map((alias) => `${alias} IPO India`)));
}

export async function collectNewsItems(ipos: IpoMatchCandidate[]): Promise<CollectedTextItem[]> {
  const maxNewsPerIpo = optionalIntEnv("PIPELINE_MAX_NEWS_PER_IPO", 10);
  const items: CollectedTextItem[] = [];

  for (const ipo of ipos) {
    for (const query of buildQueries(ipo)) {
      const url = new URL("https://news.google.com/rss/search");
      url.searchParams.set("q", query);
      url.searchParams.set("hl", "en-IN");
      url.searchParams.set("gl", "IN");
      url.searchParams.set("ceid", "IN:en");

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google News RSS failed for ${query}: ${response.status} ${await response.text()}`);
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
  }

  return items;
}
