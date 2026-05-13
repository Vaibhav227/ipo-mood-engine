# Setup

## Database

The ingestion commands require the Prisma tables to exist before they run.

For a hosted database such as Supabase, apply the checked-in migration with:

```sh
npm run db:deploy
npm run db:seed
```

Use `db:deploy` for hosted/staging/prod-style databases. `db:migrate` is meant for local development because Prisma may need a shadow database.

If `db:deploy` hangs through Supabase's pooler, use the direct SQL fallback:

```sh
npm run db:apply-schema
npm run db:seed
```

## First Ingestion Run

After the database migration and seed are complete:

```sh
npm run ingest:news
npm run ingest:manual
npm run clean:text
npm run embeddings:generate
```

Or run the whole pipeline:

```sh
npm run pipeline:daily
```

If you see `The table public.IngestionRun does not exist`, the database connection is working but migrations have not been applied yet.
