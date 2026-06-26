const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"

const COMPETITION_TO_ESPN_SLUG: Record<string, string> = {
  "International Friendlies": "fifa.friendly",
}
const DEFAULT_ESPN_SLUG = "fifa.world"

export function competitionToEspnSlug(competition: string | null | undefined): string {
  return (competition && COMPETITION_TO_ESPN_SLUG[competition]) ?? DEFAULT_ESPN_SLUG
}

export interface EspnCompetitor {
  homeAway: "home" | "away"
  team: { id: string; displayName: string }
  score: string
  winner?: boolean
}

export interface EspnDetail {
  scoringPlay: boolean
  ownGoal: boolean
  penaltyKick: boolean
  clock: { displayValue: string }
  team: { id: string }
  athletesInvolved?: { displayName: string }[]
}

export interface EspnEvent {
  id: string
  name: string
  date: string
  status: { type: { name: string; completed: boolean } }
  competitions: {
    competitors: EspnCompetitor[]
    details?: EspnDetail[]
  }[]
}

export interface FirstGoalInfo {
  firstTeam: "home" | "away"
  scorerName: string | null
}

export function parseFirstGoal(event: EspnEvent): FirstGoalInfo | null {
  const comp = event.competitions[0]
  if (!comp) return null
  const details = comp.details ?? []
  const firstGoal = details.find((d) => d.scoringPlay)
  if (!firstGoal) return null
  const home = comp.competitors.find((c) => c.homeAway === "home")
  const firstTeam = firstGoal.team.id === home?.team.id ? "home" : "away"
  const scorerName = firstGoal.athletesInvolved?.[0]?.displayName ?? null
  return { firstTeam, scorerName }
}

export async function fetchResultsByDate(date: Date, espnSlug: string = DEFAULT_ESPN_SLUG): Promise<EspnEvent[]> {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "")
  const res = await fetch(`${ESPN_BASE}/${espnSlug}/scoreboard?dates=${dateStr}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`)
  const data = await res.json()
  return data.events ?? []
}

// OddsPapi ↔ ESPN name discrepancies
const TEAM_NAME_ALIASES: Record<string, string> = {
  usa: "unitedstates",
  unitedstates: "unitedstates",
  southkorea: "southkorea",
  korearepublic: "southkorea",
  ivorycoast: "cotedivoire",
  cotedivoire: "cotedivoire",
  // ESPN uses "Czechia"; our DB uses "Czech Republic"
  czechia: "czechrepublic",
  czechrepublic: "czechrepublic",
  // ESPN uses "México" (accented); stripping non-ASCII gives "mxico"
  mxico: "mexico",
  mexico: "mexico",
  // ESPN uses "Türkiye"; stripping ü gives "trkiye". DB has both "Turkey" and "Turkiye"
  trkiye: "turkey",
  turkiye: "turkey",
  turkey: "turkey",
}

export function findEspnEventForMatch(
  events: EspnEvent[],
  homeTeam: string,
  awayTeam: string
): EspnEvent | undefined {
  const norm = (s: string) => {
    const key = s.toLowerCase().replace(/[^a-z0-9]/g, "")
    return TEAM_NAME_ALIASES[key] ?? key
  }
  return events.find((e) => {
    const comps = e.competitions[0]?.competitors ?? []
    const names = comps.map((c) => norm(c.team.displayName))
    return names.includes(norm(homeTeam)) && names.includes(norm(awayTeam))
  })
}

export function parseScores(event: EspnEvent): {
  homeScore: number
  awayScore: number
  completed: boolean
} {
  const comps = event.competitions[0]?.competitors ?? []
  const home = comps.find((c) => c.homeAway === "home")
  const away = comps.find((c) => c.homeAway === "away")
  return {
    homeScore: parseInt(home?.score ?? "0", 10),
    awayScore: parseInt(away?.score ?? "0", 10),
    completed: event.status.type.completed,
  }
}

interface EspnSummaryCompetitor {
  homeAway: "home" | "away"
  linescores?: { displayValue: string }[]
}

interface EspnSummary {
  header?: {
    competitions?: {
      competitors?: EspnSummaryCompetitor[]
    }[]
  }
}

export async function fetchHalftimeScores(
  eventId: string,
  espnSlug: string = DEFAULT_ESPN_SLUG
): Promise<{ htHomeScore: number; htAwayScore: number } | null> {
  const res = await fetch(`${ESPN_BASE}/${espnSlug}/summary?event=${eventId}`, { cache: "no-store" })
  if (!res.ok) return null
  const data: EspnSummary = await res.json()
  const comps = data.header?.competitions?.[0]?.competitors ?? []
  const home = comps.find((c) => c.homeAway === "home")
  const away = comps.find((c) => c.homeAway === "away")
  const htHomeScore = parseInt(home?.linescores?.[0]?.displayValue ?? "", 10)
  const htAwayScore = parseInt(away?.linescores?.[0]?.displayValue ?? "", 10)
  if (isNaN(htHomeScore) || isNaN(htAwayScore)) return null
  return { htHomeScore, htAwayScore }
}
