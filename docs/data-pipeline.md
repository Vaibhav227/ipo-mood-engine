# Data Pipeline

## Sources

- Reddit API for `IndiaInvestments`, `IndianStockMarket`, `DalalStreetTalks`, and `IndianStreetBets`.
- Google News RSS search for seeded IPO aliases, including source-specific searches for Livemint, Moneycontrol, CNBC TV18, Business Standard, and Economic Times.
- Manual JSON import from `data/import/manual-text-items.json`.
- Manual seeded IPO list in `data/seeds/ipos.json`.

## Storage

Postgres stores structured truth:

- IPOs
- raw text items
- cleaned text items
- embedding records
- ingestion runs

Pinecone stores semantic vectors with metadata for retrieval and mood scoring. Week 1 uses a Pinecone integrated embedding index, so the worker sends cleaned text records and Pinecone generates/stores the vectors.

## Retry Safety

The pipeline uses deterministic external IDs for ingestion and deterministic duplicate keys for cleaned text. Re-running the pipeline updates existing records instead of duplicating them.

## Required Credentials

See `.env.example`.

Reddit is optional in the daily pipeline and is disabled by default with `PIPELINE_ENABLE_REDDIT=false`. News ingestion can run without credentials because it uses public RSS URLs. Manual import can be used for copied forum, Telegram, X, or YouTube chatter during MVP demos.

Before running ingestion against a hosted database, apply schema and seed data:

```sh
npm run db:deploy
npm run db:seed
```
