-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "currentSeasonName" TEXT,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
