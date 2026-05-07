import { optionalBooleanEnv, optionalIntEnv, requiredEnv } from "../../shared/src/env.js";
import type { CollectedTextItem, IpoMatchCandidate } from "../../shared/src/types.js";
import { matchIpo } from "./ipoMatcher.js";

type RedditTokenResponse = {
  access_token: string;
};

type RedditListing = {
  data: {
    children: Array<{
      data: {
        id: string;
        name?: string;
        title?: string;
        selftext?: string;
        author?: string;
        permalink?: string;
        ups?: number;
        num_comments?: number;
        created_utc?: number;
        subreddit?: string;
      };
    }>;
  };
};

const SUBREDDITS = ["IndiaInvestments", "IndianStockMarket", "DalalStreetTalks", "IndianStreetBets"];

async function getRedditAccessToken() {
  const clientId = requiredEnv("REDDIT_CLIENT_ID");
  const clientSecret = requiredEnv("REDDIT_CLIENT_SECRET");
  const userAgent = requiredEnv("REDDIT_USER_AGENT");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent
    },
    body: new URLSearchParams({ grant_type: "client_credentials" })
  });

  if (!response.ok) {
    throw new Error(`Reddit auth failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as RedditTokenResponse;
  return data.access_token;
}

function buildQueries(ipo: IpoMatchCandidate) {
  const aliases = [ipo.name, ...ipo.aliases];
  return Array.from(
    new Set(aliases.flatMap((alias) => [alias, `${alias} IPO`, `${alias} GMP`, `${alias} listing gain`]))
  );
}

export async function collectRedditItems(ipos: IpoMatchCandidate[]): Promise<CollectedTextItem[]> {
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET || !process.env.REDDIT_USER_AGENT) {
    return collectRedditFixtureItems(ipos);
  }

  const accessToken = await getRedditAccessToken();
  const userAgent = requiredEnv("REDDIT_USER_AGENT");
  const maxPosts = optionalIntEnv("PIPELINE_MAX_REDDIT_POSTS_PER_QUERY", 10);
  const includeComments = optionalBooleanEnv("PIPELINE_INCLUDE_REDDIT_COMMENTS", true);
  const items: CollectedTextItem[] = [];

  for (const ipo of ipos) {
    for (const query of buildQueries(ipo)) {
      for (const subreddit of SUBREDDITS) {
        const url = new URL(`https://oauth.reddit.com/r/${subreddit}/search`);
        url.searchParams.set("q", query);
        url.searchParams.set("restrict_sr", "true");
        url.searchParams.set("sort", "new");
        url.searchParams.set("limit", String(maxPosts));

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": userAgent
          }
        });

        if (!response.ok) {
          throw new Error(`Reddit search failed for ${query}: ${response.status} ${await response.text()}`);
        }

        const listing = (await response.json()) as RedditListing;
        for (const child of listing.data.children) {
          const post = child.data;
          const rawText = [post.title, post.selftext].filter(Boolean).join("\n\n").trim();
          if (!rawText) continue;

          const match = matchIpo(rawText, ipos);
          const matchedIpo = match.status === "matched" ? match.ipo : undefined;
          const permalink = post.permalink ? `https://www.reddit.com${post.permalink}` : undefined;
          items.push({
            ipoId: matchedIpo?.id,
            source: "reddit",
            sourceUrl: permalink,
            externalId: `reddit:${post.name ?? post.id}`,
            rawText,
            author: post.author,
            timestamp: post.created_utc ? new Date(post.created_utc * 1000) : undefined,
            likes: post.ups,
            commentsCount: post.num_comments,
            metadata: {
              subreddit: post.subreddit ?? subreddit,
              query,
              matchedAliases: match.matchedAliases
            },
            matchStatus: match.status
          });

          if (includeComments && post.permalink && post.num_comments && post.num_comments > 0) {
            const comments = await collectPostComments(accessToken, userAgent, post.permalink, ipos, query, subreddit);
            items.push(...comments);
          }
        }
      }
    }
  }

  return items;
}

function collectRedditFixtureItems(ipos: IpoMatchCandidate[]): CollectedTextItem[] {
  const now = new Date();
  return ipos.slice(0, 3).flatMap((ipo, index) => {
    const samples = [
      `${ipo.name} IPO has strong grey market premium chatter but valuation looks stretched`,
      `Retail investors discussing ${ipo.aliases[0] ?? ipo.name} listing gain potential with cautious optimism`
    ];

    return samples.map((rawText, sampleIndex) => {
      const match = matchIpo(rawText, ipos);
      return {
        ipoId: match.status === "matched" ? match.ipo?.id : undefined,
        source: "reddit" as const,
        sourceUrl: `https://www.reddit.com/r/IndiaInvestments/comments/fixture_${index}_${sampleIndex}`,
        externalId: `reddit:fixture_${ipo.slug}_${sampleIndex}`,
        rawText,
        author: "fixture_user",
        timestamp: now,
        likes: 10 + sampleIndex,
        commentsCount: 2,
        metadata: {
          subreddit: "IndiaInvestments",
          query: `${ipo.name} IPO`,
          fixture: true,
          matchedAliases: match.matchedAliases
        },
        matchStatus: match.status
      };
    });
  });
}

async function collectPostComments(
  accessToken: string,
  userAgent: string,
  permalink: string,
  ipos: IpoMatchCandidate[],
  query: string,
  subreddit: string
): Promise<CollectedTextItem[]> {
  const url = new URL(`https://oauth.reddit.com${permalink}`);
  url.searchParams.set("limit", "10");
  url.searchParams.set("depth", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": userAgent
    }
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as Array<{
    data?: {
      children?: Array<{
        kind?: string;
        data?: {
          id?: string;
          name?: string;
          body?: string;
          author?: string;
          permalink?: string;
          ups?: number;
          created_utc?: number;
        };
      }>;
    };
  }>;

  const comments = payload[1]?.data?.children ?? [];
  return comments
    .filter((child) => child.kind === "t1" && child.data?.body)
    .map((child) => {
      const comment = child.data!;
      const match = matchIpo(comment.body!, ipos);
      return {
        ipoId: match.status === "matched" ? match.ipo?.id : undefined,
        source: "reddit" as const,
        sourceUrl: comment.permalink ? `https://www.reddit.com${comment.permalink}` : undefined,
        externalId: `reddit:${comment.name ?? comment.id}`,
        rawText: comment.body!,
        author: comment.author,
        timestamp: comment.created_utc ? new Date(comment.created_utc * 1000) : undefined,
        likes: comment.ups,
        metadata: {
          subreddit,
          query,
          kind: "comment",
          matchedAliases: match.matchedAliases
        },
        matchStatus: match.status
      };
    });
}
