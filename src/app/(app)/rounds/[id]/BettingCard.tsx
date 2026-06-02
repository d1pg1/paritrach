"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

interface Outcome {
  name: string
  price: number
  point?: number
}

interface Market {
  key: string
  outcomes: Outcome[]
}

interface OddsData {
  [marketKey: string]: Market
}

interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  startTime: Date | string
  homeScore: number | null
  awayScore: number | null
  status: string
  oddsSnapshot: { oddsData: unknown } | null
}

interface Bet {
  id: string
  marketType: string
  selection: string
  line: number | null
  coefficient: number
  isWinner: boolean | null
}

interface BetWithUser extends Bet {
  userId: string
  user: { username: string }
}

function formatBetSelection(bet: Bet): string {
  const base = `${bet.marketType}: ${bet.selection}`
  return bet.line != null ? `${base} ${bet.line}` : base
}

export function BettingCard({
  match,
  existingBet,
  allBets,
  currentUserId,
  isBettingOpen,
  isResults,
}: {
  match: Match
  existingBet: Bet | null
  allBets: BetWithUser[]
  currentUserId: string
  isBettingOpen: boolean
  isResults: boolean
}) {
  const t = useTranslations("betting")

  const [selectedMarket, setSelectedMarket] = useState<string>(
    existingBet?.marketType ?? "h2h"
  )
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!existingBet)
  const [currentBet, setCurrentBet] = useState<Bet | null>(existingBet)
  const [error, setError] = useState("")

  function marketLabel(key: string): string {
    const knownKeys = ["h2h", "double_chance", "btts", "totals", "team_totals", "h2h_h1", "spreads", "player_first_goalscorer", "goals_interval", "combo_dc_total", "result_and_total", "combo_dc_interval", "combo_h2h_interval", "legacy"] as const
    if ((knownKeys as readonly string[]).includes(key)) {
      return t(`markets.${key}` as `markets.${typeof knownKeys[number]}`)
    }
    return key
  }

  const odds = match.oddsSnapshot?.oddsData as OddsData | null
  const markets = odds ? Object.values(odds) : []
  const activeMarket = markets.find((m) => m.key === selectedMarket) ?? markets[0]

  const matchStarted = new Date() >= new Date(match.startTime)
  const canBet = isBettingOpen && !matchStarted

  async function placeBet() {
    if (!selectedOutcome) return
    setSaving(true)
    setError("")

    const payload = {
      matchId: match.id,
      marketType: selectedMarket,
      selection: selectedOutcome.name,
      line: selectedOutcome.point ?? null,
      coefficient: selectedOutcome.price,
    }

    const method = currentBet ? "PATCH" : "POST"
    const body = currentBet ? { betId: currentBet.id, ...payload } : payload

    const res = await fetch("/api/bets", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    setSaving(false)
    if (!res.ok) {
      const text = await res.text()
      setError(text)
      return
    }
    const bet = await res.json()
    setCurrentBet(bet)
    setSaved(true)
    setSelectedOutcome(null)
  }

  const winIndicator = currentBet?.isWinner === true
    ? "border-yellow-400 bg-yellow-950/20"
    : currentBet?.isWinner === false
    ? "border-red-800 bg-red-950/20"
    : "border-neutral-800"

  return (
    <div className={`bg-neutral-900 border rounded-xl p-5 ${winIndicator}`}>
      {/* Match header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-base text-gray-100">
            {match.homeTeam} <span className="text-neutral-500">vs</span> {match.awayTeam}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5" suppressHydrationWarning>
            {new Date(match.startTime).toLocaleString("uk-UA", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        {isResults && match.status === "FINAL" && match.homeScore !== null && (
          <div className="text-right">
            <p className="text-2xl font-bold">
              {match.homeScore} : {match.awayScore}
            </p>
            {currentBet && (
              <p
                className={`text-sm font-semibold mt-0.5 ${
                  currentBet.isWinner === true
                    ? "text-yellow-400"
                    : currentBet.isWinner === false
                    ? "text-red-400"
                    : "text-neutral-400"
                }`}
              >
                {currentBet.isWinner === true
                  ? t("won", { coef: currentBet.coefficient.toFixed(2) })
                  : currentBet.isWinner === false
                  ? t("lost")
                  : t("pending")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Current bet info (read-only) */}
      {currentBet && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="bg-neutral-800 rounded px-2 py-0.5 text-neutral-300">
            {marketLabel(currentBet.marketType)}
          </span>
          <span className="font-medium">{currentBet.selection}</span>
          {currentBet.line !== null && (
            <span className="text-neutral-400">({currentBet.line > 0 ? "+" : ""}{currentBet.line})</span>
          )}
          <span className="ml-auto text-yellow-400 font-semibold">
            {currentBet.coefficient.toFixed(2)}
          </span>
        </div>
      )}

      {/* Betting UI */}
      {canBet && (
        <div className="space-y-3">
          {/* Market selector */}
          <div className="flex flex-wrap gap-1.5">
            {markets.map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  setSelectedMarket(m.key)
                  setSelectedOutcome(null)
                }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedMarket === m.key
                    ? "bg-yellow-400 border-yellow-400 text-black"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                {marketLabel(m.key)}
              </button>
            ))}
          </div>

          {/* Outcomes */}
          {activeMarket && (
            <div className="flex flex-wrap gap-2">
              {activeMarket.outcomes.map((o) => {
                const isSelected =
                  selectedOutcome?.name === o.name && selectedOutcome?.point === o.point
                return (
                  <button
                    key={`${o.name}-${o.point}`}
                    onClick={() => setSelectedOutcome(isSelected ? null : o)}
                    className={`flex flex-col items-center px-4 py-2 rounded-lg border transition-colors min-w-[80px] ${
                      isSelected
                        ? "bg-yellow-400 border-yellow-400 text-black"
                        : "border-neutral-700 hover:border-neutral-500"
                    }`}
                  >
                    <span className="text-xs">{o.name}</span>
                    {o.point !== undefined && (
                      <span className="text-xs opacity-70">
                        {o.point > 0 ? "+" : ""}
                        {o.point}
                      </span>
                    )}
                    <span className="font-bold text-sm mt-0.5">{o.price.toFixed(2)}</span>
                  </button>
                )
              })}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {selectedOutcome && (
            <button
              onClick={placeBet}
              disabled={saving}
              className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-lg py-2 text-sm transition-colors"
            >
              {saving
                ? t("saving")
                : currentBet
                ? t("updateBet", { name: selectedOutcome.name, price: selectedOutcome.price.toFixed(2) })
                : t("placeBet", { name: selectedOutcome.name, price: selectedOutcome.price.toFixed(2) })}
            </button>
          )}
        </div>
      )}

      {matchStarted && !isResults && !currentBet && (
        <p className="text-sm text-neutral-500 mt-2">{t("matchStarted")}</p>
      )}
      {!canBet && !isResults && currentBet && matchStarted && (
        <p className="text-sm text-neutral-500 mt-2">{t("waitingResult")}</p>
      )}

      {allBets.length > 0 && (
        <div className="mt-4 border-t border-neutral-800 pt-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800">
                <th className="text-left pb-1.5 font-medium">{t("colUser")}</th>
                <th className="text-left pb-1.5 font-medium">{t("colBet")}</th>
                <th className="text-right pb-1.5 font-medium">{t("colCoef")}</th>
                <th className="text-right pb-1.5 font-medium">{t("colResult")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {allBets.map((bet) => (
                <tr key={bet.id}>
                  <td className={`py-1.5 ${bet.userId === currentUserId ? "text-yellow-400 font-semibold" : "text-neutral-300"}`}>
                    {bet.user.username}
                  </td>
                  <td className="py-1.5 text-neutral-300">{formatBetSelection(bet)}</td>
                  <td className="py-1.5 text-right text-neutral-300">{bet.coefficient.toFixed(2)}</td>
                  <td className="py-1.5 text-right">
                    {bet.isWinner === true ? (
                      <span className="text-green-400">{t("betWon")}</span>
                    ) : bet.isWinner === false ? (
                      <span className="text-red-400">{t("betLost")}</span>
                    ) : (
                      <span className="text-neutral-500">{t("betPending")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
