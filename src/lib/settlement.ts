export interface BetContext {
  marketType: string
  selection: string
  line: number | null
  homeScore: number
  awayScore: number
  htHomeScore?: number | null
  htAwayScore?: number | null
  rtHomeScore?: number | null
  rtAwayScore?: number | null
  homeTeam: string
  awayTeam: string
  firstGoalTeam?: "home" | "away" | null
}

export function settleBet(ctx: BetContext): boolean | null {
  const { marketType, selection, line } = ctx
  // Use regular-time (90-min) score for all basic-time markets; fall back to final score
  const homeScore = ctx.rtHomeScore ?? ctx.homeScore
  const awayScore = ctx.rtAwayScore ?? ctx.awayScore
  const total = homeScore + awayScore

  switch (marketType) {
    case "h2h": {
      if (homeScore > awayScore) return selection === "1"
      if (homeScore < awayScore) return selection === "2"
      return selection === "X"
    }
    case "double_chance": {
      const homeWin = homeScore > awayScore
      const awayWin = homeScore < awayScore
      if (selection === "1X") return !awayWin
      if (selection === "X2") return !homeWin
      if (selection === "12") return homeWin || awayWin
      return null
    }
    case "btts": {
      const bothScored = homeScore > 0 && awayScore > 0
      if (selection === "Yes") return bothScored
      if (selection === "No") return !bothScored
      return null
    }
    case "totals": {
      if (line === null) return null
      if (selection.startsWith("Over")) return total > line
      if (selection.startsWith("Under")) return total < line
      return null
    }
    case "team_totals": {
      if (line === null) return null
      const isHome = selection.includes(ctx.homeTeam)
      const teamScore = isHome ? homeScore : awayScore
      if (selection.includes("Over")) return teamScore > line
      if (selection.includes("Under")) return teamScore < line
      return null
    }
    case "h2h_h1": {
      const hh = ctx.htHomeScore
      const ah = ctx.htAwayScore
      if (hh === null || hh === undefined || ah === null || ah === undefined)
        return null // needs halftime score — mark for manual review
      if (hh > ah) return selection === "1"
      if (hh < ah) return selection === "2"
      return selection === "X"
    }
    case "spreads": {
      // European handicap: e.g. selection "1 (-1)" means home wins by 2+
      if (line === null) return null
      const adjustedHome = homeScore + line
      if (adjustedHome > awayScore) return selection.startsWith("1")
      if (adjustedHome < awayScore) return selection.startsWith("2")
      return selection.startsWith("X")
    }
    case "correct_score":
      return selection === `${homeScore}:${awayScore}`
    case "first_goal": {
      const { firstGoalTeam } = ctx
      if (firstGoalTeam === undefined || firstGoalTeam === null) return null
      const total = homeScore + awayScore
      if (total === 0) return selection === "No Goal"
      if (selection === "1") return firstGoalTeam === "home"
      if (selection === "2") return firstGoalTeam === "away"
      if (selection === "No Goal") return false
      return null
    }
    case "combo_dc_total": {
      const [dc, total] = selection.split("+")
      const r1 = settleBet({ ...ctx, marketType: "double_chance", selection: dc })
      const r2 = settleBet({ ...ctx, marketType: "totals", selection: total })
      if (r1 === null || r2 === null) return null
      return r1 && r2
    }
    case "result_and_total": {
      const [h2h, total] = selection.split("+")
      const r1 = settleBet({ ...ctx, marketType: "h2h", selection: h2h })
      const r2 = settleBet({ ...ctx, marketType: "totals", selection: total })
      if (r1 === null || r2 === null) return null
      return r1 && r2
    }
    case "player_first_goalscorer":
      return null
    case "goals_interval": {
      const [lo, hi] = selection.split("-").map(Number)
      return total >= lo && total <= hi
    }
    case "combo_dc_interval": {
      const [dc, interval] = selection.split("+")
      const r1 = settleBet({ ...ctx, marketType: "double_chance", selection: dc })
      const r2 = settleBet({ ...ctx, marketType: "goals_interval", selection: interval })
      if (r1 === null || r2 === null) return null
      return r1 && r2
    }
    case "combo_h2h_interval": {
      const [h2h, interval] = selection.split("+")
      const r1 = settleBet({ ...ctx, marketType: "h2h", selection: h2h })
      const r2 = settleBet({ ...ctx, marketType: "goals_interval", selection: interval })
      if (r1 === null || r2 === null) return null
      return r1 && r2
    }
    default:
      return null
  }
}
