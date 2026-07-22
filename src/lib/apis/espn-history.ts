import { fetchEspnTeams, type EspnTeamInfo } from "@/lib/apis/espn"

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
const DEFAULT_ESPN_SLUG = "fifa.world"

export interface HistoryMatch {
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  competition: string | null
}

function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    // Common ESPN ↔ FIFA name divergences
    .replace(/^unitedstates$/, "usa")
    .replace(/^czechia$/, "czechrepublic")
    .replace(/^ivorycoast$/, "cotedivoire")
    .replace(/^northmacedonia$/, "northmacedonia")
}

async function getEspnTeamId(teamName: string, espnSlug: string): Promise<string | null> {
  const teams: EspnTeamInfo[] = await fetchEspnTeams(espnSlug)
  const input = normName(teamName)

  // Exact match first
  let hit = teams.find(
    (t) => normName(t.displayName) === input || normName(t.shortDisplayName) === input
  )

  // Substring match fallback
  if (!hit) {
    hit = teams.find(
      (t) =>
        normName(t.displayName).includes(input) ||
        input.includes(normName(t.displayName))
    )
  }

  return hit?.id ?? null
}

interface EspnScore {
  value?: number
  displayValue?: string
}

interface EspnCompetitor {
  homeAway: "home" | "away"
  team: { id: string; displayName: string }
  score: string | EspnScore
}

interface EspnScheduleEvent {
  id: string
  date: string
  season?: { displayName?: string }
  competitions: {
    status?: { type?: { completed?: boolean } }
    competitors: EspnCompetitor[]
    notes?: { headline?: string }[]
  }[]
}

interface RawScheduleEntry {
  id: string
  match: HistoryMatch
}

// ESPN ignores the season param and always returns the same ~25 most recent matches.
async function fetchTeamScheduleRaw(teamId: string): Promise<RawScheduleEntry[]> {
  try {
    const year = new Date().getFullYear()
    const res = await fetch(
      `${ESPN_BASE}/all/teams/${teamId}/schedule?season=${year}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()

    const events: EspnScheduleEvent[] = data.events ?? []
    const results: RawScheduleEntry[] = []

    for (const event of events) {
      const comp = event.competitions?.[0]
      if (!comp?.status?.type?.completed) continue

      const home = comp.competitors.find((c) => c.homeAway === "home")
      const away = comp.competitors.find((c) => c.homeAway === "away")
      if (!home || !away) continue

      const parseScore = (s: string | EspnScore): number => {
        if (typeof s === "string") return parseInt(s, 10)
        if (typeof s?.value === "number") return s.value
        return parseInt(s?.displayValue ?? "", 10)
      }

      const homeScore = parseScore(home.score)
      const awayScore = parseScore(away.score)
      if (isNaN(homeScore) || isNaN(awayScore)) continue

      results.push({
        id: event.id,
        match: {
          date: event.date,
          homeTeam: home.team.displayName,
          awayTeam: away.team.displayName,
          homeScore,
          awayScore,
          competition: event.season?.displayName ?? comp.notes?.[0]?.headline ?? null,
        },
      })
    }

    return results
  } catch {
    return []
  }
}

export async function getTeamRecentMatches(
  teamName: string,
  espnSlug: string = DEFAULT_ESPN_SLUG,
  limit = 5
): Promise<HistoryMatch[]> {
  const teamId = await getEspnTeamId(teamName, espnSlug)
  if (!teamId) return []

  const now = new Date()
  const entries = await fetchTeamScheduleRaw(teamId)
  return entries
    .map((e) => e.match)
    .filter((m) => new Date(m.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}

// H2H: intersect both teams' ESPN schedules by event ID.
// ESPN only returns ~25 most recent matches per team (~2 years).
// Meetings older than that window will not appear.
export async function getH2HMatches(
  teamA: string,
  teamB: string,
  espnSlug: string = DEFAULT_ESPN_SLUG,
  limit = 5
): Promise<HistoryMatch[]> {
  const [idA, idB] = await Promise.all([getEspnTeamId(teamA, espnSlug), getEspnTeamId(teamB, espnSlug)])
  if (!idA || !idB) return []

  const [entriesA, entriesB] = await Promise.all([
    fetchTeamScheduleRaw(idA),
    fetchTeamScheduleRaw(idB),
  ])

  const idsB = new Set(entriesB.map((e) => e.id))
  const now = new Date()

  return entriesA
    .filter((e) => idsB.has(e.id) && new Date(e.match.date) < now)
    .map((e) => e.match)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}
