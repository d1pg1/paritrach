import { db } from "@/lib/db"
import { fetchEventsForSport } from "@/lib/apis/odds-api"
import { fetchFixturesForTournament, type RawFixture } from "@/lib/apis/oddspapi"
import { ensureTeamLogos } from "@/lib/team-logo-resolver"
import { competitionToEspnSlugs } from "@/lib/apis/espn"
import type { CompetitionConfig } from "@/lib/competitions"

async function fetchFixtures(competition: CompetitionConfig): Promise<RawFixture[]> {
  if (competition.source === "oddspapi") {
    return fetchFixturesForTournament(competition.oddsPapiTournamentId)
  }
  const events = await fetchEventsForSport(competition.oddsApiSportKey)
  // The Odds API only lists an event once its market is open, so events from this source
  // are always odds-ready — unlike OddsPapi's fixture list, which includes fixtures months
  // before any bookmaker has priced them.
  return events.map((e) => ({
    id: e.id,
    startTime: e.commence_time,
    homeTeam: e.home_team,
    awayTeam: e.away_team,
    hasOdds: true,
  }))
}

export async function importFixturesForCompetitions(
  roundId: string,
  competitions: CompetitionConfig[],
): Promise<{ imported: number; total: number }> {
  const existingIds = (
    await db.match.findMany({ where: { roundId }, select: { externalId: true } })
  ).map((m: { externalId: string | null }) => m.externalId)

  // Sequential with a stagger — OddsPapi's rate limit is tight enough that even single
  // requests under ~2.5s apart intermittently 429 (measured empirically), not just bursts.
  const results: { competition: CompetitionConfig; fixtures: RawFixture[]; toInsert: RawFixture[] }[] = []
  for (let i = 0; i < competitions.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2500))
    const c = competitions[i]
    const fixtures = await fetchFixtures(c).catch(() => [])
    const toInsert = fixtures.filter((f) => f.hasOdds && !existingIds.includes(f.id))
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
    void ensureTeamLogos(teamNames, competitionToEspnSlugs(competition.label))
  }

  const imported = results.reduce((s, r) => s + r.toInsert.length, 0)
  const total = results.reduce((s, r) => s + r.fixtures.length, 0)
  return { imported, total }
}
