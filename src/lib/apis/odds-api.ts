const BASE = "https://api.the-odds-api.com/v4"
const KEY = process.env.ODDS_API_KEY!

export interface OddsApiEvent {
  id: string
  sport_key: string
  commence_time: string
  home_team: string
  away_team: string
}

export async function fetchWorldCupEvents(): Promise<OddsApiEvent[]> {
  const url = `${BASE}/sports/soccer_fifa_world_cup/events?apiKey=${KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`The Odds API error: ${res.status}`)
  return res.json()
}
