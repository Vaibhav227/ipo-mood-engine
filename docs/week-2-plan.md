# Week 2 Plan

Week 2 turns the Week 1 data spine into IPO mood intelligence.

Implemented first:

- Deterministic mood taxonomy.
- Mood score aggregation from cleaned text.
- IPO personality and summary generation.
- Daily `MoodScoreSnapshot` persistence.

Command:

```sh
npm run score:mood:psql
```

This is intentionally rule-weighted first. Semantic clustering and GPT summaries can layer on top once the baseline mood snapshots are stable.
