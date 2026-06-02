-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "apiFootballId" INTEGER,
ADD COLUMN     "liveAwayScore" INTEGER,
ADD COLUMN     "liveHomeScore" INTEGER;

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "team" TEXT NOT NULL,
    "scorerName" TEXT,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchEvent_matchId_minute_team_key" ON "MatchEvent"("matchId", "minute", "team");

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
