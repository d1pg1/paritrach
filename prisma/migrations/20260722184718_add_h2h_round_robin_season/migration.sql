-- CreateEnum
CREATE TYPE "SeasonFormat" AS ENUM ('SOLO', 'H2H');

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "sequenceNumber" INTEGER;

-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "format" "SeasonFormat" NOT NULL DEFAULT 'SOLO';

-- AlterTable
ALTER TABLE "SeasonContestant" ADD COLUMN     "drawPosition" INTEGER;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "currentSeasonId" TEXT;
