"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  startTime: Date | string
  isEligible: boolean
  status: string
  homeScore: number | null
  awayScore: number | null
  oddsSnapshot: { fetchedAt: Date | string } | null
  _count: { bets: number }
}

interface Round {
  id: string
  name: string
  status: string
  matches: Match[]
}

export function AdminRoundControls({ round }: { round: Round }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const router = useRouter()

  async function apiCall(path: string, method = "POST") {
    setLoading(path)
    setError("")
    const res = await fetch(`/api/admin/rounds/${round.id}/${path}`, { method })
    const data = await res.json().catch(() => ({}))
    setLoading(null)
    if (!res.ok) {
      setError(`Error: ${data.message ?? res.statusText}`)
    } else {
      router.refresh()
    }
  }

  async function toggleEligible(matchId: string, eligible: boolean) {
    setLoading(matchId)
    await fetch(`/api/admin/rounds/${round.id}/eligible`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, eligible }),
    })
    setLoading(null)
    router.refresh()
  }

  const isSetup = round.status === "SETUP"
  const isBetting = round.status === "BETTING"
  const isResults = round.status === "RESULTS"

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{round.name}</h1>
          <p className="text-sm text-neutral-400 mt-1">Status: <span className="text-yellow-400">{round.status}</span></p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isSetup && (
            <button
              onClick={() => apiCall("import-fixtures")}
              disabled={!!loading}
              className="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {loading === "import-fixtures" ? "Importing…" : "Import Fixtures"}
            </button>
          )}
          {isSetup && round.matches.some((m) => m.isEligible) && (
            <button
              onClick={() => apiCall("open-betting")}
              disabled={!!loading}
              className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-lg px-3 py-1.5 text-sm transition-colors"
            >
              {loading === "open-betting" ? "Opening…" : "Open Betting & Lock Odds"}
            </button>
          )}
          {(isBetting || isResults) && (
            <button
              onClick={() => apiCall("refresh-odds")}
              disabled={!!loading}
              className="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {loading === "refresh-odds" ? "Refreshing…" : "Refresh Odds"}
            </button>
          )}
          {(isBetting || isResults) && (
            <button
              onClick={() => apiCall("check-results")}
              disabled={!!loading}
              className="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {loading === "check-results" ? "Checking…" : "Check Results (ESPN)"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-950 border border-red-800 rounded-lg px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {round.matches.length === 0 ? (
        <p className="text-neutral-400">No matches yet. Click "Import Fixtures" to load from The Odds API.</p>
      ) : (
        <>
          <input
            type="text"
            placeholder="Search matches…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full mb-3 bg-neutral-800 border border-neutral-700 text-neutral-100 placeholder-neutral-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
        <div className="space-y-2">
          {round.matches.filter((m) =>
            `${m.homeTeam} ${m.awayTeam}`.toLowerCase().includes(search.toLowerCase())
          ).map((match) => (
            <div
              key={match.id}
              className={`flex items-center gap-4 bg-neutral-900 border rounded-lg px-4 py-3 ${
                match.isEligible ? "border-yellow-700" : "border-neutral-800"
              }`}
            >
              <input
                type="checkbox"
                checked={match.isEligible}
                disabled={!isSetup || loading === match.id}
                onChange={(e) => toggleEligible(match.id, e.target.checked)}
                className="w-4 h-4 accent-yellow-400"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-white">
                  {match.homeTeam} vs {match.awayTeam}
                </p>
                <p className="text-xs text-neutral-400" suppressHydrationWarning>
                  {new Date(match.startTime).toLocaleString("uk-UA", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="text-right text-xs text-neutral-400 shrink-0">
                {match.oddsSnapshot ? (
                  <span className="text-yellow-400">Odds locked</span>
                ) : match.isEligible ? (
                  <span className="text-neutral-500">No odds yet</span>
                ) : null}
                {match._count.bets > 0 && (
                  <p className="mt-0.5">{match._count.bets} bet{match._count.bets !== 1 ? "s" : ""}</p>
                )}
                {match.status === "FINAL" && match.homeScore !== null && (
                  <p className="text-white font-semibold mt-0.5">
                    {match.homeScore} : {match.awayScore}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {(isBetting || isResults) && <BetSummaryTable roundId={round.id} />}
    </div>
  )
}

function BetSummaryTable({ roundId }: { roundId: string }) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3">Round Scoreboard (live)</h2>
      <iframe
        src={`/api/scoreboard?roundId=${roundId}&format=table`}
        className="hidden"
      />
      <p className="text-sm text-neutral-400">
        See the{" "}
        <a href="/scoreboard" className="text-yellow-400 underline">
          global scoreboard
        </a>{" "}
        for full standings.
      </p>
    </div>
  )
}
