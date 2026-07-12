"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { UserAvatar } from "@/components/UserAvatar"
import { TeamLogo } from "@/components/TeamLogo"
import { TeamHistoryPanel, type HistoryType } from "@/components/TeamHistoryPanel"

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
  user: { username: string; nickname: string | null; logoUrl: string | null }
}


export function BettingCard({
  match,
  existingBet,
  allBets,
  currentUserId,
  currentUsername,
  isBettingOpen,
  isResults,
  liveScore,
  teamLogoMap = {},
}: {
  match: Match
  existingBet: Bet | null
  allBets: BetWithUser[]
  currentUserId: string
  currentUsername: string
  isBettingOpen: boolean
  isResults: boolean
  liveScore?: {
    homeScore: number
    awayScore: number
    statusName: string
    events: { minute: number; team: string; scorerName: string | null; eventType: string }[]
  } | null
  teamLogoMap?: Record<string, string>
}) {
  const t = useTranslations("betting")

  const [selectedMarket, setSelectedMarket] = useState<string>(
    existingBet?.marketType ?? "h2h"
  )
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!existingBet)
  const [currentBet, setCurrentBet] = useState<Bet | null>(existingBet)
  const [localAllBets, setLocalAllBets] = useState<BetWithUser[]>(allBets)
  const [error, setError] = useState("")
  const [historyView, setHistoryView] = useState<HistoryType | null>(null)

  function marketLabel(key: string): string {
    const knownKeys = ["h2h", "double_chance", "btts", "totals", "team_totals", "h2h_h1", "spreads", "player_first_goalscorer", "goals_interval", "combo_dc_total", "result_and_total", "combo_dc_interval", "combo_h2h_interval", "to_qualify", "legacy"] as const
    if ((knownKeys as readonly string[]).includes(key)) {
      return t(`markets.${key}` as `markets.${typeof knownKeys[number]}`)
    }
    return key
  }

  const LINE_IN_NAME_MARKETS = new Set(["combo_dc_total", "result_and_total"])

  function formatLine(line: number, marketType?: string, selection?: string): string {
    if (marketType !== "spreads") return String(line)
    // The stored line is always relative to home ("1"); flip it for away ("2")
    const effective = selection === "2" ? -line : line
    return (effective > 0 ? "+" : "") + effective
  }

  const odds = match.oddsSnapshot?.oddsData as OddsData | null
  const markets = odds ? Object.values(odds) : []
  const activeMarket = markets.find((m) => m.key === selectedMarket) ?? markets[0]

  const matchStarted = new Date() >= new Date(match.startTime)
  const canBet = isBettingOpen && !matchStarted

  async function placeBet() {
    if (!selectedOutcome) return
    if (selectedOutcome.price <= 1.4) {
      setError(t("minCoefError"))
      return
    }
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
    const betWithUser: BetWithUser = {
      ...bet,
      userId: currentUserId,
      user: { username: currentUsername, nickname: null },
    }
    setLocalAllBets((prev) => {
      const idx = prev.findIndex((b) => b.userId === currentUserId)
      if (idx >= 0) {
        return prev.map((b, i) => i === idx ? { ...b, ...bet } : b)
      }
      return [...prev, betWithUser]
    })
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
          <p className="font-semibold text-base text-gray-100 flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5">
              <TeamLogo name={match.homeTeam} size={20} logoUrl={teamLogoMap[match.homeTeam.toLowerCase()]} />
              {match.homeTeam}
            </span>
            <span className="text-neutral-500">vs</span>
            <span className="flex items-center gap-1.5">
              <TeamLogo name={match.awayTeam} size={20} logoUrl={teamLogoMap[match.awayTeam.toLowerCase()]} />
              {match.awayTeam}
            </span>
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
        {match.status === "FINAL" && match.homeScore !== null && (
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
        {!isResults && liveScore && (
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">
              {liveScore.homeScore} : {liveScore.awayScore}
            </p>
            <p className="text-xs text-green-400 mt-0.5 animate-pulse">
              {liveScore.statusName}
            </p>
            {liveScore.events.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {liveScore.events.map((ev, i) => (
                  <p key={i} className="text-xs text-neutral-400 text-right flex items-center justify-end gap-1">
                    <span className="text-neutral-500">{ev.minute}&apos;</span>
                    <TeamLogo
                      name={ev.team === "home" ? match.homeTeam : match.awayTeam}
                      size={14}
                      logoUrl={teamLogoMap[(ev.team === "home" ? match.homeTeam : match.awayTeam).toLowerCase()]}
                    />
                    <span className={ev.team === "home" ? "text-sky-400" : "text-orange-400"}>
                      {ev.team === "home" ? match.homeTeam : match.awayTeam}
                    </span>
                    {ev.scorerName ?? "—"}
                    {ev.eventType === "Own Goal" && <span className="text-neutral-500"> (OG)</span>}
                    {ev.eventType === "Penalty" && <span className="text-neutral-500"> (P)</span>}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* History buttons */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {[
          { type: "home" as HistoryType, label: match.homeTeam },
          { type: "away" as HistoryType, label: match.awayTeam },
          { type: "h2h" as HistoryType, label: "H2H" },
        ].map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setHistoryView(historyView === type ? null : type)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              historyView === type
                ? "border-neutral-500 text-neutral-200 bg-neutral-800"
                : "border-neutral-700 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {historyView && (
        <TeamHistoryPanel
          home={match.homeTeam}
          away={match.awayTeam}
          type={historyView}
          teamLogoMap={teamLogoMap}
        />
      )}

      {/* Current bet info (read-only) */}
      {currentBet && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="bg-neutral-800 rounded px-2 py-0.5 text-neutral-300">
            {marketLabel(currentBet.marketType)}
          </span>
          <span className="font-medium">{currentBet.selection}</span>
          {currentBet.line !== null && !LINE_IN_NAME_MARKETS.has(currentBet.marketType) && (
            <span className="text-neutral-400">({formatLine(currentBet.line, currentBet.marketType, currentBet.selection)})</span>
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
                        {formatLine(o.point, selectedMarket, o.name)}
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
      {!canBet && match.status !== "FINAL" && currentBet && matchStarted && (
        <p className="text-sm text-neutral-500 mt-2">{t("waitingResult")}</p>
      )}

      {localAllBets.length > 0 && (
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
              {localAllBets.map((bet) => (
                <tr key={bet.id}>
                  <td className={`py-1.5 pr-2 ${bet.userId === currentUserId ? "text-yellow-400 font-semibold" : "text-neutral-300"}`}>
                    <div className="flex items-center gap-1.5">
                      <UserAvatar
                        logoUrl={bet.user.logoUrl}
                        displayName={bet.user.nickname ?? bet.user.username}
                        size={24}
                      />
                      {bet.user.nickname ?? bet.user.username}
                    </div>
                  </td>
                  <td className="py-1.5 text-neutral-300">
                    {marketLabel(bet.marketType)}: {bet.selection}{bet.line != null && !LINE_IN_NAME_MARKETS.has(bet.marketType) ? ` ${formatLine(bet.line, bet.marketType, bet.selection)}` : ""}
                  </td>
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
