"use client"

import { useEffect, useState } from "react"
import { BettingCard } from "./BettingCard"

interface LiveScore {
  matchId: string
  homeScore: number
  awayScore: number
  statusName: string
}

type BettingCardProps = React.ComponentProps<typeof BettingCard>

interface MatchEntry {
  match: BettingCardProps["match"]
  existingBet: BettingCardProps["existingBet"]
  allBets: BettingCardProps["allBets"]
}

interface SharedProps {
  currentUserId: string
  currentUsername: string
  isBettingOpen: boolean
  isResults: boolean
}

interface Props {
  roundId: string
  entries: MatchEntry[]
  shared: SharedProps
}

const POLL_INTERVAL = 30_000

export function LiveScorePoller({ roundId, entries, shared }: Props) {
  const [liveScores, setLiveScores] = useState<Record<string, LiveScore>>({})

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(`/api/rounds/${roundId}/live-scores`)
        if (!res.ok || cancelled) return
        const data: LiveScore[] = await res.json()
        setLiveScores(Object.fromEntries(data.map((s) => [s.matchId, s])))
      } catch {
        // silent — stale scores are fine
      }
    }

    poll()
    const timer = setInterval(poll, POLL_INTERVAL)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [roundId])

  return (
    <div className="space-y-4">
      {entries.map(({ match, existingBet, allBets }) => (
        <BettingCard
          key={match.id}
          match={match}
          existingBet={existingBet}
          allBets={allBets}
          liveScore={liveScores[match.id] ?? null}
          {...shared}
        />
      ))}
    </div>
  )
}
