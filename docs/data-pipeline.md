# Data Pipeline

## Sources

- Reddit API for `IndiaInvestments`, `IndianStockMarket`, `DalalStreetTalks`, and `IndianStreetBets`.
- Google News RSS search for seeded IPO aliases.
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

If Reddit credentials are missing, Reddit ingestion uses small deterministic fixtures so the pipeline remains testable. News ingestion can run without credentials because it uses public RSS URLs.
