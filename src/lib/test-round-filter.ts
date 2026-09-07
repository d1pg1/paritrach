import type { Prisma } from "@/generated/prisma/client"

// Rounds (or whole seasons) used to test the platform are named with "test"/"тест" —
// exclude them from player statistics so scratch/practice data doesn't skew win rates.
export const excludeTestRoundsWhere: Prisma.RoundWhereInput = {
  NOT: {
    OR: [
      { name: { contains: "test", mode: "insensitive" } },
      { name: { contains: "тест", mode: "insensitive" } },
      { season: { name: { contains: "test", mode: "insensitive" } } },
      { season: { name: { contains: "тест", mode: "insensitive" } } },
    ],
  },
}
