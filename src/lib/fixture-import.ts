import { db } from "@/lib/db"
import { fetchEventsForSport } from "@/lib/apis/odds-api"
import { fetchFixturesForTournament, type RawFixture } from "@/lib/apis/oddspapi"
import { ensureTeamLogos } from "@/lib/team-logo-resolver"
import type { CompetitionConfig } from "@/lib/competitions"

async function fetchFixtures(competition: CompetitionConfig): Promise<RawFixture[]> {
  if (competition.source === "oddspapi") {
    return fetchFixturesForTournament(competition.oddsPapiTournamentId)
  }
  const events = await fetchEventsForSport(competition.oddsApiSportKey)
  return events.map((e) => ({
    id: e.id,
    startTime: e.commence_time,
    homeTeam: e.home_team,
    awayTeam: e.away_team,
  }))
}

export async function importFixturesForCompetitions(
  roundId: string,
  competitions: CompetitionConfig[],
): Promise<{ imported: number; total: number }> {
  const existingIds = (
    await db.match.findMany({ where: { roundId }, select: { externalId: true } })
  ).map((m: { externalId: string | null }) => m.externalId)

  // Sequential with a small stagger — firing all competitions at once can trip OddsPapi's
  // per-second rate limit (seen in practice with 3 simultaneous cup-competition requests).
  const results: { competition: CompetitionConfig; fixtures: RawFixture[]; toInsert: RawFixture[] }[] = []
  for (let i = 0; i < competitions.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 500))
    const c = competitions[i]
    const fixtures = await fetchFixtures(c).catch(() => [])
    const toInsert = fixtures.filter((f) => !existingIds.includes(f.id))
    results.push({ competition: c, fixtures, toInsert })
  }

  for (const { competition, toInsert } of results) {
    if (!toInsert.length) continue

    await db.match.createMany({
      data: toInsert.map((f) => ({
        roundId,
        externalId: f.id,
        competition: competition.label,
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        startTime: new Date(f.startTime),
      })),
    })

    const teamNames = toInsert.flatMap((f) => [f.homeTeam, f.awayTeam])
    void ensureTeamLogos(teamNames, competition.espnSlug)
  }

  const imported = results.reduce((s, r) => s + r.toInsert.length, 0)
  const total = results.reduce((s, r) => s + r.fixtures.length, 0)
  return { imported, total }
}
