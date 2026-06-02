-- CreateTable
CREATE TABLE "SeasonContestant" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SeasonContestant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SeasonContestant" ADD CONSTRAINT "SeasonContestant_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonContestant" ADD CONSTRAINT "SeasonContestant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique indexes to handle NULL seasonId correctly
CREATE UNIQUE INDEX "sc_season_user_uniq" ON "SeasonContestant"("seasonId", "userId") WHERE "seasonId" IS NOT NULL;
CREATE UNIQUE INDEX "sc_current_user_uniq" ON "SeasonContestant"("userId") WHERE "seasonId" IS NULL;
