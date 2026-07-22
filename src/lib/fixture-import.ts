import { db } from "@/lib/db"
import { fetchEventsForSport } from "@/lib/apis/odds-api"
import { ensureTeamLogos } from "@/lib/team-logo-resolver"
import type { CompetitionConfig } from "@/lib/competitions"

export async function importFixturesForCompetitions(
  roundId: string,
  competitions: CompetitionConfig[],
): Promise<{ imported: number; total: number }> {
  const existingIds = (
    await db.match.findMany({ where: { roundId }, select: { externalId: true } })
  ).map((m: { externalId: string | null }) => m.externalId)

  const results = await Promise.all(
    competitions.map(async (c) => {
      const events = await fetchEventsForSport(c.oddsApiSportKey).catch(() => [])
      const toInsert = events.filter((e) => !existingIds.includes(e.id))
      return { competition: c, events, toInsert }
    }),
  )

  for (const { competition, toInsert } of results) {
    if (!toInsert.length) continue

    await db.match.createMany({
      data: toInsert.map((e) => ({
        roundId,
        externalId: e.id,
        competition: competition.label,
        homeTeam: e.home_team,
        awayTeam: e.away_team,
        startTime: new Date(e.commence_time),
      })),
    })

    const teamNames = toInsert.flatMap((e) => [e.home_team, e.away_team])
    void ensureTeamLogos(teamNames, competition.espnSlug)
  }

  const imported = results.reduce((s, r) => s + r.toInsert.length, 0)
  const total = results.reduce((s, r) => s + r.events.length, 0)
  return { imported, total }
}
