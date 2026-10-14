"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { TeamLogo } from "@/components/TeamLogo"
import type { H2HOdds } from "@/lib/apis/odds-api"
import { TeamHistoryPanel, type HistoryType } from "@/components/TeamHistoryPanel"

interface BetDetail {
  id: string
  userId: string
  marketType: string
  selection: string
  line: number | null
  coefficient: number
  isWinner: boolean | null
  user: { username: string; nickname: string | null }
}

interface Match {
  id: string
  externalId: string | null
  homeTeam: string
  awayTeam: string
  startTime: Date | string
  isEligible: boolean
  status: string
  homeScore: number | null
  awayScore: number | null
  competition: string | null
  oddsSnapshot: { fetchedAt: Date | string } | null
  _count: { bets: number }
  bets: BetDetail[]
}

interface Round {
  id: string
  name: string
  status: string
  matches: Match[]
}

function formatBetSelection(bet: BetDetail): string {
  const base = `${bet.marketType}: ${bet.selection}`
  return bet.line != null ? `${base} ${bet.line}` : base
}

export function AdminRoundControls({ round, teamLogoMap = {}, h2hOdds = {} }: { round: Round; teamLogoMap?: Record<string, string>; h2hOdds?: Record<string, H2HOdds> }) {
  const t = useTranslations("admin")
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null)
  const [historyView, setHistoryView] = useState<{ matchId: string; type: HistoryType } | null>(null)
  const router = useRouter()

  async function apiCall(path: string, method = "POST") {
    setLoading(path)
    setError("")
    const res = await fetch(`/api/admin/rounds/${round.id}/${path}`, { method })
    setLoading(null)
    if (!res.ok) {
      const message = await res.text().catch(() => "")
      setError(`Error: ${message || res.statusText || res.status}`)
    } else {
      router.refresh()
    }
  }

  async function toggleEligible(matchId: string, eligible: boolean) {
    setLoading(matchId)
    setError("")
    const res = await fetch(`/api/admin/rounds/${round.id}/eligible`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, eligible }),
    })
    setLoading(null)
    if (!res.ok) {
      const message = await res.text().catch(() => "")
      setError(`Error: ${message || res.statusText || res.status}`)
    } else {
      router.refresh()
    }
  }

  async function deleteRound() {
    const totalBets = round.matches.reduce((s, m) => s + m._count.bets, 0)
    if (!window.confirm(t("deleteConfirm", { bets: totalBets }))) return
    setLoading("delete")
    setError("")
    const res = await fetch(`/api/admin/rounds/${round.id}`, { method: "DELETE" })
    if (!res.ok) {
      const message = await res.text().catch(() => "")
      setError(`Error: ${message || res.statusText || res.status}`)
      setLoading(null)
    } else {
      router.push("/admin")
    }
  }

  const isSetup = round.status === "SETUP"
  const isBetting = round.status === "BETTING"
  const isResults = round.status === "RESULTS"

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{round.name}</h1>
          <p className="text-sm text-muted mt-1">
            {t("roundStatus")} <span className="text-accent">{round.status}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isSetup && (
            <button
              onClick={() => apiCall("import/leagues")}
              disabled={!!loading}
              className="bg-surface-3 hover:bg-surface-4 disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {loading === "import/leagues" ? t("importing") : t("importLeagues")}
            </button>
          )}
          {isSetup && (
            <button
              onClick={() => apiCall("import/cups")}
              disabled={!!loading}
              className="bg-surface-3 hover:bg-surface-4 disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {loading === "import/cups" ? t("importing") : t("importCups")}
            </button>
          )}
          {isSetup && (
            <button
              onClick={() => apiCall("import/internationals")}
              disabled={!!loading}
              className="bg-surface-3 hover:bg-surface-4 disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {loading === "import/internationals" ? t("importing") : t("importInternationals")}
            </button>
          )}
          {isSetup && round.matches.some((m) => m.isEligible) && (
            <button
              onClick={() => apiCall("open-betting")}
              disabled={!!loading}
              className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-lg px-3 py-1.5 text-sm transition-colors"
            >
              {loading === "open-betting" ? t("opening") : t("openBetting")}
            </button>
          )}
          {(isBetting || isResults) && (
            <button
              onClick={() => apiCall("refresh-odds")}
              disabled={!!loading}
              className="bg-surface-3 hover:bg-surface-4 disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {loading === "refresh-odds" ? t("refreshing") : t("refreshOdds")}
            </button>
          )}
          {(isBetting || isResults) && (
            <button
              onClick={() => apiCall("check-results")}
              disabled={!!loading}
              className="bg-surface-3 hover:bg-surface-4 disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {loading === "check-results" ? t("checking") : t("checkResults")}
            </button>
          )}
          <button
            onClick={deleteRound}
            disabled={!!loading}
            className="bg-danger-btn hover:bg-danger-btn-hover disabled:opacity-50 text-on-danger-btn rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            {loading === "delete" ? t("deleting") : t("deleteRound")}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-danger-tint border border-danger-line rounded-lg px-4 py-2 text-sm text-danger-fg">
          {error}
        </div>
      )}

      {round.matches.length === 0 ? (
        <p className="text-muted">{t("noMatches")}</p>
      ) : (
        <>
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full mb-3 bg-surface-2 border border-line-2 text-fg placeholder-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
          <div className="space-y-2">
            {round.matches
              .filter((m) =>
                `${m.homeTeam} ${m.awayTeam}`.toLowerCase().includes(search.toLowerCase())
              )
              .map((match) => (
                <div key={match.id}>
                  <div
                    className={`flex items-center gap-4 bg-surface border rounded-lg px-4 py-3 ${
                      match.isEligible ? "border-yellow-700" : "border-line"
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
                      <p className="font-medium text-sm text-fg flex items-center gap-1.5 flex-wrap">
                        <TeamLogo name={match.homeTeam} size={18} logoUrl={teamLogoMap[match.homeTeam.toLowerCase()]} />
                        {match.homeTeam}
                        <span className="text-subtle">vs</span>
                        <TeamLogo name={match.awayTeam} size={18} logoUrl={teamLogoMap[match.awayTeam.toLowerCase()]} />
                        {match.awayTeam}
                      </p>
                      <p className="text-xs text-muted" suppressHydrationWarning>
                        {new Date(match.startTime).toLocaleString("uk-UA", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {match.competition && (
                        <p className="text-xs text-subtle mt-0.5">{match.competition}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {([
                          { type: "home" as HistoryType, label: match.homeTeam },
                          { type: "away" as HistoryType, label: match.awayTeam },
                          { type: "h2h" as HistoryType, label: "H2H" },
                        ]).map(({ type, label }) => {
                          const active =
                            historyView?.matchId === match.id && historyView.type === type
                          return (
                            <button
                              key={type}
                              onClick={() =>
                                setHistoryView(active ? null : { matchId: match.id, type })
                              }
                              className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                active
                                  ? "border-line-4 text-fg-2 bg-surface-2"
                                  : "border-line-2 text-subtle hover:border-line-3 hover:text-fg-3"
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted shrink-0">
                      {match.externalId && h2hOdds[match.externalId] && (
                        <p className="font-mono tabular-nums mb-0.5">
                          {h2hOdds[match.externalId].home.toFixed(2)}
                          <span className="text-faint"> × </span>
                          {h2hOdds[match.externalId].draw.toFixed(2)}
                          <span className="text-faint"> × </span>
                          {h2hOdds[match.externalId].away.toFixed(2)}
                        </p>
                      )}
                      {match.oddsSnapshot ? (
                        <span className="text-accent">{t("oddsLocked")}</span>
                      ) : match.isEligible ? (
                        <span className="text-subtle">{t("noOdds")}</span>
                      ) : null}
                      {match.bets.length > 0 && (
                        <button
                          onClick={() =>
                            setExpandedMatchId(expandedMatchId === match.id ? null : match.id)
                          }
                          className="mt-0.5 block text-accent hover:text-accent-hi transition-colors"
                        >
                          {t("betCount", { count: match.bets.length })}{" "}
                          {expandedMatchId === match.id ? "▴" : "▾"}
                        </button>
                      )}
                      {match.status === "FINAL" && match.homeScore !== null && (
                        <p className="text-fg font-semibold mt-0.5">
                          {match.homeScore} : {match.awayScore}
                        </p>
                      )}
                    </div>
                  </div>

                  {historyView?.matchId === match.id && (
                    <div className="border border-t-0 border-line rounded-b-lg bg-panel px-4 py-3">
                      <TeamHistoryPanel
                        home={match.homeTeam}
                        away={match.awayTeam}
                        type={historyView.type}
                        competition={match.competition}
                        teamLogoMap={teamLogoMap}
                      />
                    </div>
                  )}

                  {expandedMatchId === match.id && match.bets.length > 0 && (
                    <div className="border border-t-0 border-line rounded-b-lg bg-panel px-4 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-subtle border-b border-line">
                            <th className="text-left pb-1.5 font-medium">User</th>
                            <th className="text-left pb-1.5 font-medium">Bet</th>
                            <th className="text-right pb-1.5 font-medium">Coef</th>
                            <th className="text-right pb-1.5 font-medium">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {match.bets.map((bet) => (
                            <tr key={bet.id}>
                              <td className="py-1.5 text-fg-3">{bet.user.nickname ?? bet.user.username}</td>
                              <td className="py-1.5 text-fg-3">{formatBetSelection(bet)}</td>
                              <td className="py-1.5 text-right text-fg-3">
                                {bet.coefficient.toFixed(2)}
                              </td>
                              <td className="py-1.5 text-right">
                                {bet.isWinner === true ? (
                                  <span className="text-success">{t("betWon")}</span>
                                ) : bet.isWinner === false ? (
                                  <span className="text-danger">{t("betLost")}</span>
                                ) : (
                                  <span className="text-subtle">{t("betPending")}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
  const t = useTranslations("admin")
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3">{t("scoreboardTitle")}</h2>
      <iframe
        src={`/api/scoreboard?roundId=${roundId}&format=table`}
        className="hidden"
      />
      <p className="text-sm text-muted">
        {t.rich("scoreboardLink", {
          link: (chunks) => (
            <a href="/scoreboard" className="text-accent underline">
              {chunks}
            </a>
          ),
        })}
      </p>
    </div>
  )
}
