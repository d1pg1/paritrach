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
  team: { displayName: string }
  score: string
  winner?: boolean
}

export interface EspnEvent {
  id: string
  name: string
  date: string
  status: { type: { name: string; completed: boolean } }
  competitions: {
    competitors: EspnCompetitor[]
    details?: { clock: { displayValue: string }; team: { id: string } }[]
  }[]
}

export async function fetchResultsByDate(date: Date, espnSlug: string = DEFAULT_ESPN_SLUG): Promise<EspnEvent[]> {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "")
  const res = await fetch(`${ESPN_BASE}/${espnSlug}/scoreboard?dates=${dateStr}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`)
  const data = await res.json()
  return data.events ?? []
}

export function findEspnEventForMatch(
  events: EspnEvent[],
  homeTeam: string,
  awayTeam: string
): EspnEvent | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "")
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
