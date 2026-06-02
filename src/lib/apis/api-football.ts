const BASE = "https://v3.api-football.com"
const KEY = process.env.API_FOOTBALL_API_KEY!

const headers = { "x-apisports-key": KEY }

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "")

export interface GoalEvent {
  minute: number
  teamName: string
  scorerName: string
  eventType: string // "Goal" | "Own Goal" | "Penalty"
}

interface ApiFixture {
  fixture: { id: number; date: string }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
}

interface ApiEvent {
  time: { elapsed: number }
  team: { id: number; name: string }
  player: { id: number; name: string }
  type: string
  detail: string
}

export async function findApiFootballFixtureId(
  homeTeam: string,
  awayTeam: string,
  date: string // "YYYY-MM-DD"
): Promise<number | null> {
  const res = await fetch(`${BASE}/fixtures?date=${date}`, { headers, cache: "no-store" })
  if (!res.ok) return null
  const data = await res.json()
  const fixtures: ApiFixture[] = data.response ?? []
  const match = fixtures.find((f) => {
    const h = norm(f.teams.home.name)
    const a = norm(f.teams.away.name)
    return h === norm(homeTeam) && a === norm(awayTeam)
  })
  return match?.fixture.id ?? null
}

export async function fetchGoalEvents(fixtureId: number): Promise<GoalEvent[]> {
  const res = await fetch(`${BASE}/fixtures/events?fixture=${fixtureId}`, { headers, cache: "no-store" })
  if (!res.ok) return []
  const data = await res.json()
  const events: ApiEvent[] = data.response ?? []
  return events
    .filter((e) => e.type === "Goal" && e.detail !== "Missed Penalty")
    .map((e) => ({
      minute: e.time.elapsed,
      teamName: e.team.name,
      scorerName: e.player.name,
      eventType: e.detail === "Own Goal" ? "Own Goal" : e.detail === "Penalty" ? "Penalty" : "Goal",
    }))
}
