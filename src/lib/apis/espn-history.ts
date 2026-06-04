const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"

export interface HistoryMatch {
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  competition: string | null
}

interface EspnTeam {
  id: string
  displayName: string
  shortDisplayName: string
}

// Module-level cache so repeated calls within the same process don't re-fetch
let teamsCache: EspnTeam[] | null = null

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

async function getEspnTeams(): Promise<EspnTeam[]> {
  if (teamsCache) return teamsCache
  try {
    const res = await fetch(`${ESPN_BASE}/fifa.world/teams`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return []
    const data = await res.json()
    teamsCache =
      (data.sports?.[0]?.leagues?.[0]?.teams ?? []).map(
        (entry: { team: EspnTeam }) => entry.team
      )
    return teamsCache!
  } catch {
    return []
  }
}

async function getEspnTeamId(teamName: string): Promise<string | null> {
  const teams = await getEspnTeams()
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

async function fetchTeamSchedule(
  teamId: string,
  season: number
): Promise<HistoryMatch[]> {
  try {
    const res = await fetch(
      `${ESPN_BASE}/all/teams/${teamId}/schedule?season=${season}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()

    const events: EspnScheduleEvent[] = data.events ?? []
    const results: HistoryMatch[] = []

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
        date: event.date,
        homeTeam: home.team.displayName,
        awayTeam: away.team.displayName,
        homeScore,
        awayScore,
        competition: event.season?.displayName ?? comp.notes?.[0]?.headline ?? null,
      })
    }

    return results
  } catch {
    return []
  }
}

export async function getTeamRecentMatches(
  teamName: string,
  limit = 5
): Promise<HistoryMatch[]> {
  const teamId = await getEspnTeamId(teamName)
  if (!teamId) return []

  const now = new Date()
  const currentYear = now.getFullYear()
  const pastMatches: HistoryMatch[] = []

  for (let year = currentYear; year >= currentYear - 5; year--) {
    const matches = await fetchTeamSchedule(teamId, year)
    const past = matches.filter((m) => new Date(m.date) < now)
    pastMatches.push(...past)
    if (pastMatches.length >= limit) break
  }

  return pastMatches
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}

export async function getH2HMatches(
  teamA: string,
  teamB: string,
  limit = 5
): Promise<HistoryMatch[]> {
  const teamId = await getEspnTeamId(teamA)
  if (!teamId) return []

  const now = new Date()
  const currentYear = now.getFullYear()
  const normB = normName(teamB)
  const h2h: HistoryMatch[] = []

  for (let year = currentYear; year >= currentYear - 5; year--) {
    const matches = await fetchTeamSchedule(teamId, year)
    const filtered = matches.filter(
      (m) =>
        new Date(m.date) < now &&
        (normName(m.homeTeam) === normB || normName(m.awayTeam) === normB)
    )
    h2h.push(...filtered)
    if (h2h.length >= limit) break
  }

  return h2h
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}
