export interface BetContext {
  marketType: string
  selection: string
  line: number | null
  homeScore: number
  awayScore: number
  htHomeScore?: number | null
  htAwayScore?: number | null
  homeTeam: string
  awayTeam: string
}

export function settleBet(ctx: BetContext): boolean | null {
  const { marketType, selection, line, homeScore, awayScore } = ctx
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
    case "player_first_goalscorer":
      // Cannot be settled from scoreboard data alone — requires manual input
      return null
    default:
      return null
  }
}
