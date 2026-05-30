# IPO Mood Engine

Backend data pipeline for IPOMetrics' IPO Mood Engine.

The goal of this codebase is to collect Indian IPO discussion/news text, clean and normalize it, store it in Postgres, create Pinecone vectors using Pinecone-hosted embeddings, and prepare mood scores/snapshots for the product UI.

## Current Status

Implemented so far:

- IPO seed database.
- News ingestion through Google News RSS queries.
- Manual JSON import for copied chatter.
- Optional Reddit ingestion, disabled by default.
- IPO alias matching.
- Raw text storage.
- Text cleaning, slang normalization, duplicate detection, and spam scoring.
- Pinecone embedding/upsert flow using Pinecone Inference plus Pinecone vector upsert.
- Mood taxonomy, scoring, snapshots, and terminal reports.

Confirmed Week 1 data run:

```txt
IPOs: 6
Raw text items: 561
Cleaned text items: 253
Pinecone embedding records: 252
Remaining eligible cleaned items: 0
```

## Architecture

```txt
Seed IPOs
  ↓
Data ingestion
  ├─ Google News RSS
  ├─ Manual JSON import
  └─ Reddit API (optional)
  ↓
IPO alias matching
  ↓
Raw text storage in Postgres
  ↓
Cleaning + normalization
  ↓
Cleaned text storage in Postgres
  ↓
Pinecone Inference embeddings
  ↓
Pinecone vector upsert
  ↓
Embedding records in Postgres
  ↓
Mood scoring snapshots (Week 2 layer)
```

## Repository Layout

```txt
apps/
  worker/
    src/commands/        CLI commands for ingestion, cleaning, embeddings, scoring
    src/lib/             Worker helpers

packages/
  db/
    prisma/              Prisma schema and migrations
    src/                 DB client, seed, psql fallback utilities
  ingestion/
    src/                 News/manual/Reddit collectors, matcher, cleaner, raw storage
  embeddings/
    src/                 Pinecone Inference + vector upsert logic
  scoring/
    src/                 Mood taxonomy and scoring logic
  shared/
    src/                 Shared types and env helpers

data/
  seeds/                 IPO seed data
  import/                Manual text import data

docs/                    Setup and week-specific notes
tests/                   Unit tests for matcher, cleaner, Pinecone metadata shape
```

## Main Data Models

The Prisma schema lives at:

```txt
packages/db/prisma/schema.prisma
```

Core tables:

- `Ipo`: seeded IPOs and aliases.
- `RawTextItem`: raw collected text from news, manual imports, or Reddit.
- `CleanedTextItem`: normalized text, duplicate key, spam score.
- `EmbeddingRecord`: tracks which cleaned text records were sent to Pinecone.
- `IngestionRun`: stores ingestion run summaries.
- `MoodScoreSnapshot`: started for Week 2 mood snapshots.

## Environment Variables

Use `.env.example` as the reference.

Required for database:

```txt
DATABASE_URL
```

Required for Pinecone:

```txt
PINECONE_API_KEY
PINECONE_INDEX
PINECONE_HOST
```

Optional Pinecone config:

```txt
PINECONE_NAMESPACE
PINECONE_EMBED_MODEL
PINECONE_UPSERT_BATCH_SIZE
```

Current Pinecone behavior:

- Uses Pinecone Inference API to embed text.
- Uses normal Pinecone vector upsert.
- Does not require a Pinecone integrated embedding index.

Optional Reddit config:

```txt
PIPELINE_ENABLE_REDDIT
REDDIT_CLIENT_ID
REDDIT_CLIENT_SECRET
REDDIT_USER_AGENT
```

Reddit is disabled by default because it was unreliable during MVP setup.

## Setup Flow

Install dependencies:

```sh
npm install
```

Generate Prisma client:

```sh
npm run db:generate
```

Check database URL shape:

```sh
npm run db:check
```

Ping database:

```sh
npm run db:ping
```

For Supabase, `db:deploy` may hang through the pooler. If that happens, use:

```sh
npm run db:apply-schema
```

Then seed IPOs:

```sh
npm run db:seed
```

## Step-by-Step Execution Flow

### 1. Seed IPOs

Seed file:

```txt
data/seeds/ipos.json
```

Command:

```sh
npm run db:seed
```

What it does:

- Reads IPO seed records.
- Upserts IPOs into `Ipo`.
- Stores aliases used later for matching text to IPOs.

### 2. Ingest News

Command:

```sh
npm run ingest:news
```

Main files:

```txt
apps/worker/src/commands/ingestNews.ts
packages/ingestion/src/newsCollector.ts
packages/ingestion/src/rawTextStore.ts
```

What it does:

- Loads seeded IPOs.
- Builds Google News RSS queries for each IPO.
- Includes source-specific searches for Livemint, Moneycontrol, CNBC TV18, Business Standard, and Economic Times.
- Matches each headline/snippet to an IPO using aliases.
- Stores records in `RawTextItem`.

### 3. Ingest Manual Text

Manual import file:

```txt
data/import/manual-text-items.json
```

Command:

```sh
npm run ingest:manual
```

What it does:

- Reads manually curated text items.
- Matches them to seeded IPOs.
- Stores them in `RawTextItem` with source `manual`.

Use this for copied forum, Telegram, X, YouTube, or other MVP sample chatter.

### 4. Optional Reddit Ingestion

Command:

```sh
npm run ingest:reddit
```

Daily pipeline uses Reddit only when:

```txt
PIPELINE_ENABLE_REDDIT=true
```

What it does:

- Uses Reddit OAuth credentials.
- Searches configured Indian investing subreddits.
- Stores posts/comments in `RawTextItem`.

If credentials are missing, the collector can fall back to deterministic fixtures.

### 5. Clean Text

Command:

```sh
npm run clean:text
```

Main files:

```txt
apps/worker/src/commands/cleanText.ts
packages/ingestion/src/cleaningProcessor.ts
packages/ingestion/src/textCleaner.ts
```

What it does:

- Reads matched raw text items.
- Lowercases and normalizes text.
- Removes URLs and noisy punctuation.
- Converts important emojis into sentiment words.
- Normalizes IPO slang:
  - `gmp` -> `grey market premium`
  - `hni` -> `high net worth investor`
  - `nii` -> `non institutional investor`
  - `qib` -> `qualified institutional buyer`
  - `rhp` -> `red herring prospectus`
  - `drhp` -> `draft red herring prospectus`
- Computes `duplicateKey`.
- Computes rule-based `spamScore`.
- Stores output in `CleanedTextItem`.

### 6. Generate Pinecone Embeddings

Preferred command for this environment:

```sh
npm run embeddings:generate:psql
```

Main files:

```txt
apps/worker/src/commands/generateEmbeddingsPsql.ts
packages/embeddings/src/pineconeClient.ts
packages/db/src/psql.ts
```

What it does:

- Reads eligible cleaned text using `psql`.
- Sends text to Pinecone Inference.
- Receives embedding vectors from Pinecone.
- Upserts vectors to the configured Pinecone index.
- Stores `EmbeddingRecord` rows in Postgres.

Why this has a `psql` fallback:

- Prisma worked for many commands but became unreliable through the Supabase pooler in this local environment.
- `psql` was stable, so the embedding completion path uses `psql` for DB reads/writes.

The Prisma-based command also exists:

```sh
npm run embeddings:generate
```

Use it if Prisma is stable in your environment.

### 7. Daily Pipeline

Command:

```sh
npm run pipeline:daily
```

Current flow:

```txt
load IPOs
  ↓
optional Reddit ingestion
  ↓
news ingestion
  ↓
manual ingestion
  ↓
clean text
  ↓
generate embeddings
  ↓
print run summary
```

Note: the daily pipeline currently calls the Prisma embedding command. In this local setup, use `embeddings:generate:psql` manually if Prisma is flaky.

## Mood Scoring Layer

Week 2 files:

```txt
packages/scoring/src/moodTaxonomy.ts
packages/scoring/src/moodScorer.ts
apps/worker/src/commands/scoreMoodPsql.ts
```

Scoring command:

```sh
npm run score:mood:psql
```

Report command:

```sh
npm run report:mood:psql
```

What scoring does:

- Read cleaned text per IPO.
- Score against mood categories such as:
  - `fomo_frenzy`
  - `valuation_concern`
  - `operator_hype`
  - `listing_gain_expectation`
  - `institutional_confidence`
- Store daily `MoodScoreSnapshot` records.

What reporting does:

- Reads the latest `MoodScoreSnapshot` per IPO.
- Prints mood, item count, top scores, top narratives, and summary.

## Common Development Commands

```sh
npm run typecheck
npm test
npm run db:check
npm run db:ping
npm run db:apply-schema
npm run db:seed
npm run ingest:news
npm run ingest:manual
npm run clean:text
npm run embeddings:generate:psql
npm run score:mood:psql
npm run report:mood:psql
```

## Known Environment Notes

### Supabase Pooler

`npm run db:deploy` may hang through the Supabase pooler. Use:

```sh
npm run db:apply-schema
```

### Prisma

The Prisma client is configured with:

```prisma
engineType = "binary"
```

This avoids macOS/Codex code-signing issues with Prisma's library engine.

### Pinecone

The current Pinecone index is not an integrated embedding index. The code therefore uses:

```txt
Pinecone Inference API -> vector values
Pinecone vector upsert -> index storage
```

This keeps embeddings inside Pinecone without using OpenAI embeddings.

### Tests

Tests existed and passed earlier:

```txt
7 tests passed
```

At one point, Vitest became blocked locally by a native Rollup code-signing issue in the Codex/macOS Node environment. TypeScript still passes with:

```sh
npm run typecheck
```

## Current Recommended Manual Run

For the current environment, use this sequence:

```sh
npm run db:apply-schema
npm run db:seed
npm run ingest:news
npm run ingest:manual
npm run clean:text
npm run embeddings:generate:psql
npm run score:mood:psql
npm run report:mood:psql
```

Then verify remaining embeddings:

```sh
npm run embeddings:generate:psql
```

Expected final state after a successful Week 1 run:

```txt
Found 0 cleaned items eligible for Pinecone upsert
Embeddings complete: 0 records stored, 0 Pinecone upserts
```
