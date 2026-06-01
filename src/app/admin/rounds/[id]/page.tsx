import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { AdminRoundControls } from "./AdminRoundControls"

export default async function AdminRoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const round = await db.round.findUnique({
    where: { id },
    include: {
      matches: {
        include: {
          _count: { select: { bets: true } },
          oddsSnapshot: { select: { fetchedAt: true } },
        },
        orderBy: { startTime: "asc" },
      },
    },
  })

  if (!round) notFound()

  return <AdminRoundControls round={round} />
}
