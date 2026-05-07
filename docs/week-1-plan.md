# Week 1 Plan

Build the backend-only data spine for the IPO Mood Engine.

The Week 1 pipeline collects Reddit and news text for seeded Indian IPOs, stores raw items in Postgres, cleans and deduplicates text, and upserts cleaned text records to a Pinecone integrated embedding index.

Primary command:

```sh
npm run pipeline:daily
```

Pipeline:

```txt
seed IPOs -> ingest Reddit/news -> clean text -> dedupe -> embed -> Pinecone -> run summary
```

Week 1 intentionally excludes frontend, Twitter/X, Telegram, YouTube, mood scoring, and GPT summaries.
