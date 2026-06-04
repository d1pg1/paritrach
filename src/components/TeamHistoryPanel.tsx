"use client"

import { useState, useEffect } from "react"
import { TeamLogo } from "@/components/TeamLogo"

export interface HistoryMatch {
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  competition: string | null
}

export type HistoryType = "home" | "away" | "h2h"

export function TeamHistoryPanel({
  home,
  away,
  type,
  teamLogoMap = {},
}: {
  home: string
  away: string
  type: HistoryType
  teamLogoMap?: Record<string, string>
}) {
  const [matches, setMatches] = useState<HistoryMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    fetch(
      `/api/team-history?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&type=${type}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error()
        setMatches(data.matches ?? [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [home, away, type])

  const focusTeam = type === "home" ? home : type === "away" ? away : null

  return (
    <div className="mt-2 border-t border-neutral-800 pt-2">
      {loading && (
        <p className="text-xs text-neutral-500 py-1.5">Loading...</p>
      )}
      {!loading && error && (
        <p className="text-xs text-red-400 py-1.5">Could not load match history</p>
      )}
      {!loading && !error && matches.length === 0 && (
        <p className="text-xs text-neutral-500 py-1.5">No recent matches found</p>
      )}
      {!loading && !error && matches.length > 0 && (
        <div className="space-y-1">
          {matches.map((m, i) => {
            const normFocus = focusTeam?.toLowerCase()
            const isHome =
              normFocus != null
                ? m.homeTeam.toLowerCase() === normFocus
                : null
            const ourScore =
              isHome === null ? null : isHome ? m.homeScore : m.awayScore
            const theirScore =
              isHome === null ? null : isHome ? m.awayScore : m.homeScore
            const result =
              ourScore !== null && theirScore !== null
                ? ourScore > theirScore
                  ? "W"
                  : ourScore < theirScore
                  ? "L"
                  : "D"
                : null

            return (
              <div
                key={i}
                className="flex items-center gap-2 text-xs bg-neutral-800/60 rounded px-2.5 py-1.5"
              >
                {result && (
                  <span
                    className={`font-bold w-3.5 shrink-0 text-center ${
                      result === "W"
                        ? "text-green-400"
                        : result === "L"
                        ? "text-red-400"
                        : "text-neutral-400"
                    }`}
                  >
                    {result}
                  </span>
                )}
                <span className="text-neutral-500 shrink-0 w-[4.5rem]">
                  {new Date(m.date).toLocaleDateString("uk-UA", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                </span>
                <span className="flex items-center gap-1 flex-1 min-w-0 justify-end">
                  <span className="truncate text-right text-neutral-300">
                    {m.homeTeam}
                  </span>
                  <TeamLogo
                    name={m.homeTeam}
                    size={13}
                    logoUrl={teamLogoMap[m.homeTeam.toLowerCase()]}
                  />
                </span>
                <span className="font-bold tabular-nums shrink-0 text-white">
                  {m.homeScore}:{m.awayScore}
                </span>
                <span className="flex items-center gap-1 flex-1 min-w-0">
                  <TeamLogo
                    name={m.awayTeam}
                    size={13}
                    logoUrl={teamLogoMap[m.awayTeam.toLowerCase()]}
                  />
                  <span className="truncate text-neutral-300">{m.awayTeam}</span>
                </span>
                {m.competition && (
                  <span className="text-neutral-600 shrink-0 hidden sm:block max-w-[7rem] truncate">
                    {m.competition}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
