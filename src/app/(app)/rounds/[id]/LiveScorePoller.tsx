"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { BettingCard } from "./BettingCard"

interface GoalEvent {
  minute: number
  team: string
  scorerName: string | null
  eventType: string
}

interface LiveScore {
  matchId: string
  homeScore: number
  awayScore: number
  statusName: string
  events: GoalEvent[]
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
  teamLogoMap: Record<string, string>
}

interface Props {
  roundId: string
  entries: MatchEntry[]
  shared: SharedProps
}

const POLL_INTERVAL = 30_000

export function LiveScorePoller({ roundId, entries, shared }: Props) {
  const t = useTranslations("round")
  const [liveScores, setLiveScores] = useState<Record<string, LiveScore>>({})
  const [bettedMatchIds, setBettedMatchIds] = useState<Set<string>>(
    () => new Set(entries.filter((e) => e.existingBet).map((e) => e.match.id))
  )

  const handleBetPlaced = useCallback((matchId: string) => {
    setBettedMatchIds((prev) => new Set(prev).add(matchId))
  }, [])

  const now = Date.now()
  const bettableMatchIds = entries
    .filter((e) => new Date(e.match.startTime).getTime() > now)
    .map((e) => e.match.id)
  const totalBettable = bettableMatchIds.length
  const bettedCount = bettableMatchIds.filter((id) => bettedMatchIds.has(id)).length
  const allBetted = bettedCount === totalBettable
  const showProgress = shared.isBettingOpen && totalBettable > 0

  useEffect(() => {
    if (!showProgress || allBetted) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [showProgress, allBetted])

  useEffect(() => {
    if (!showProgress || allBetted) return
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement)?.closest?.("a")
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#") || anchor.target === "_blank") return
      const url = new URL(href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      if (!window.confirm(t("leaveWarning", { count: bettedCount, total: totalBettable }))) {
        e.preventDefault()
      }
    }
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [showProgress, allBetted, bettedCount, totalBettable, t])

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
      {showProgress && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
            allBetted
              ? "border-green-800 bg-green-950/20 text-green-400"
              : "border-yellow-800 bg-yellow-950/10 text-yellow-400"
          }`}
        >
          <span>
            {allBetted
              ? t("allBetted")
              : t("betsProgress", { count: bettedCount, total: totalBettable })}
          </span>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {bettableMatchIds.map((id) => (
              <span
                key={id}
                className={`h-1.5 w-4 rounded-full ${
                  bettedMatchIds.has(id) ? "bg-green-400" : "bg-neutral-700"
                }`}
              />
            ))}
          </div>
        </div>
      )}
      {entries.map(({ match, existingBet, allBets }) => (
        <BettingCard
          key={match.id}
          match={match}
          existingBet={existingBet}
          allBets={allBets}
          liveScore={liveScores[match.id] ?? null}
          onBetPlaced={handleBetPlaced}
          {...shared}
        />
      ))}
    </div>
  )
}
