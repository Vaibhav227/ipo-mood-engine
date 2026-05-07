CREATE TABLE "Ipo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "aliases" TEXT[],
    "sector" TEXT,
    "status" TEXT NOT NULL,
    "openDate" TIMESTAMP(3),
    "closeDate" TIMESTAMP(3),
    "listingDate" TIMESTAMP(3),
    "exchange" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ipo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RawTextItem" (
    "id" TEXT NOT NULL,
    "ipoId" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "externalId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "author" TEXT,
    "timestamp" TIMESTAMP(3),
    "likes" INTEGER,
    "commentsCount" INTEGER,
    "metadata" JSONB,
    "matchStatus" TEXT NOT NULL DEFAULT 'matched',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawTextItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CleanedTextItem" (
    "id" TEXT NOT NULL,
    "rawTextItemId" TEXT NOT NULL,
    "ipoId" TEXT NOT NULL,
    "cleanedText" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "spamScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duplicateKey" TEXT NOT NULL,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanedTextItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmbeddingRecord" (
    "id" TEXT NOT NULL,
    "cleanedTextItemId" TEXT NOT NULL,
    "ipoId" TEXT NOT NULL,
    "pineconeVectorId" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbeddingRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "iposProcessed" INTEGER NOT NULL DEFAULT 0,
    "rawItemsCollected" INTEGER NOT NULL DEFAULT 0,
    "matchedItems" INTEGER NOT NULL DEFAULT 0,
    "duplicatesSkipped" INTEGER NOT NULL DEFAULT 0,
    "spamSkipped" INTEGER NOT NULL DEFAULT 0,
    "embeddingsGenerated" INTEGER NOT NULL DEFAULT 0,
    "pineconeUpserts" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ipo_slug_key" ON "Ipo"("slug");
CREATE UNIQUE INDEX "RawTextItem_source_externalId_key" ON "RawTextItem"("source", "externalId");
CREATE INDEX "RawTextItem_ipoId_idx" ON "RawTextItem"("ipoId");
CREATE INDEX "RawTextItem_source_idx" ON "RawTextItem"("source");
CREATE INDEX "RawTextItem_matchStatus_idx" ON "RawTextItem"("matchStatus");
CREATE UNIQUE INDEX "CleanedTextItem_rawTextItemId_key" ON "CleanedTextItem"("rawTextItemId");
CREATE INDEX "CleanedTextItem_ipoId_idx" ON "CleanedTextItem"("ipoId");
CREATE INDEX "CleanedTextItem_duplicateKey_idx" ON "CleanedTextItem"("duplicateKey");
CREATE INDEX "CleanedTextItem_isDuplicate_idx" ON "CleanedTextItem"("isDuplicate");
CREATE INDEX "CleanedTextItem_spamScore_idx" ON "CleanedTextItem"("spamScore");
CREATE UNIQUE INDEX "EmbeddingRecord_cleanedTextItemId_key" ON "EmbeddingRecord"("cleanedTextItemId");
CREATE UNIQUE INDEX "EmbeddingRecord_pineconeVectorId_key" ON "EmbeddingRecord"("pineconeVectorId");
CREATE INDEX "EmbeddingRecord_ipoId_idx" ON "EmbeddingRecord"("ipoId");
CREATE INDEX "EmbeddingRecord_embeddingModel_idx" ON "EmbeddingRecord"("embeddingModel");

ALTER TABLE "RawTextItem" ADD CONSTRAINT "RawTextItem_ipoId_fkey" FOREIGN KEY ("ipoId") REFERENCES "Ipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CleanedTextItem" ADD CONSTRAINT "CleanedTextItem_rawTextItemId_fkey" FOREIGN KEY ("rawTextItemId") REFERENCES "RawTextItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CleanedTextItem" ADD CONSTRAINT "CleanedTextItem_ipoId_fkey" FOREIGN KEY ("ipoId") REFERENCES "Ipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmbeddingRecord" ADD CONSTRAINT "EmbeddingRecord_cleanedTextItemId_fkey" FOREIGN KEY ("cleanedTextItemId") REFERENCES "CleanedTextItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmbeddingRecord" ADD CONSTRAINT "EmbeddingRecord_ipoId_fkey" FOREIGN KEY ("ipoId") REFERENCES "Ipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
