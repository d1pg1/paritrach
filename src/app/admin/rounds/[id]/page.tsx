import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { AdminRoundControls } from "./AdminRoundControls"
import { getTeamLogoMap } from "@/lib/team-logo-resolver"
import { fetchH2HOddsForSport, type H2HOdds } from "@/lib/apis/odds-api"
import { fetchH2HOddsForTournaments } from "@/lib/apis/oddspapi"
import { competitionByLabel } from "@/lib/competitions"

export default async function AdminRoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const round = await db.round.findUnique({
    where: { id },
    include: {
      matches: {
        select: {
          id: true,
          homeTeam: true,
          awayTeam: true,
          startTime: true,
          isEligible: true,
          status: true,
          homeScore: true,
          awayScore: true,
          competition: true,
          externalId: true,
          oddsSnapshot: { select: { fetchedAt: true } },
          _count: { select: { bets: true } },
          bets: {
            include: { user: { select: { username: true, nickname: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { startTime: "asc" },
      },
    },
  })

  if (!round) notFound()

  const teamNames = round.matches.flatMap((m) => [m.homeTeam, m.awayTeam])
  const [teamLogoMap, h2hOdds] = await Promise.all([
    getTeamLogoMap(teamNames),
    (async (): Promise<Record<string, H2HOdds>> => {
      if (round.status !== "SETUP" || round.matches.length === 0) return {}

      const active = [...new Set(round.matches.map((m) => m.competition))]
        .map(competitionByLabel)
        .filter((c) => c !== undefined)

      const oddsApiCompetitions = active.filter((c) => c.oddsApiSportKey)
      const oddsPapiTournamentIds = active
        .filter((c) => !c.oddsApiSportKey)
        .map((c) => c.oddsPapiTournamentId)

      const [oddsApiResults, oddsPapiOdds] = await Promise.all([
        Promise.all(oddsApiCompetitions.map((c) => fetchH2HOddsForSport(c.oddsApiSportKey).catch(() => ({})))),
        oddsPapiTournamentIds.length
          ? fetchH2HOddsForTournaments(oddsPapiTournamentIds).catch(() => ({}))
          : Promise.resolve({}),
      ])

      return Object.assign({}, ...oddsApiResults, oddsPapiOdds)
    })(),
  ])

  return <AdminRoundControls round={round} teamLogoMap={teamLogoMap} h2hOdds={h2hOdds} />
}
