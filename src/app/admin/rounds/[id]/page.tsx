import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { AdminRoundControls } from "./AdminRoundControls"
import { getTeamLogoMap } from "@/lib/team-logo-resolver"

export default async function AdminRoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const round = await db.round.findUnique({
    where: { id },
    include: {
      matches: {
        include: {
          _count: { select: { bets: true } },
          oddsSnapshot: { select: { fetchedAt: true } },
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
  const teamLogoMap = await getTeamLogoMap(teamNames)

  return <AdminRoundControls round={round} teamLogoMap={teamLogoMap} />
}
