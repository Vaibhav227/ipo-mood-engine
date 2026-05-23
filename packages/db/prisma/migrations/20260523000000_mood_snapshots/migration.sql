CREATE TABLE "MoodScoreSnapshot" (
    "id" TEXT NOT NULL,
    "ipoId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "sourceWindowStartedAt" TIMESTAMP(3),
    "sourceWindowEndedAt" TIMESTAMP(3),
    "totalItems" INTEGER NOT NULL,
    "moodScores" JSONB NOT NULL,
    "topNarratives" JSONB NOT NULL,
    "personality" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodScoreSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MoodScoreSnapshot_ipoId_snapshotDate_key" ON "MoodScoreSnapshot"("ipoId", "snapshotDate");
CREATE INDEX "MoodScoreSnapshot_snapshotDate_idx" ON "MoodScoreSnapshot"("snapshotDate");
CREATE INDEX "MoodScoreSnapshot_ipoId_idx" ON "MoodScoreSnapshot"("ipoId");

ALTER TABLE "MoodScoreSnapshot" ADD CONSTRAINT "MoodScoreSnapshot_ipoId_fkey" FOREIGN KEY ("ipoId") REFERENCES "Ipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
