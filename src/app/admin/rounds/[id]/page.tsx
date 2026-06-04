import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { AdminRoundControls } from "./AdminRoundControls"
import { getTeamLogoMap } from "@/lib/team-logo-resolver"
import { fetchWorldCupH2HOdds, type H2HOdds } from "@/lib/apis/odds-api"
import { fetchFriendliesH2HOdds } from "@/lib/apis/oddspapi"

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
      const hasWorldCup = round.matches.some((m) => m.competition === "FIFA World Cup 2026")
      const hasFriendlies = round.matches.some((m) => m.competition === "International Friendlies")
      const [wcOdds, frOdds] = await Promise.all([
        hasWorldCup ? fetchWorldCupH2HOdds().catch(() => ({})) : Promise.resolve({}),
        hasFriendlies ? fetchFriendliesH2HOdds().catch(() => ({})) : Promise.resolve({}),
      ])
      return { ...wcOdds, ...frOdds }
    })(),
  ])

  return <AdminRoundControls round={round} teamLogoMap={teamLogoMap} h2hOdds={h2hOdds} />
}
