const BASE = "https://api.the-odds-api.com/v4"
const KEY = process.env.ODDS_API_KEY!

export interface OddsApiEvent {
  id: string
  sport_key: string
  commence_time: string
  home_team: string
  away_team: string
}

export interface H2HOdds {
  home: number
  draw: number
  away: number
}

export async function fetchEventsForSport(sportKey: string): Promise<OddsApiEvent[]> {
  const url = `${BASE}/sports/${sportKey}/events?apiKey=${KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`The Odds API error: ${res.status}`)
  return res.json()
}

interface OddsApiEventWithOdds extends OddsApiEvent {
  bookmakers: Array<{
    key: string
    markets: Array<{
      key: string
      outcomes: Array<{ name: string; price: number }>
    }>
  }>
}

function median(prices: number[]): number {
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export async function fetchH2HOddsForSport(sportKey: string): Promise<Record<string, H2HOdds>> {
  const url = `${BASE}/sports/${sportKey}/odds?apiKey=${KEY}&regions=eu&markets=h2h&oddsFormat=decimal`
  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) return {}
  const events: OddsApiEventWithOdds[] = await res.json()

  const result: Record<string, H2HOdds> = {}
  for (const event of events) {
    const homePrices: number[] = []
    const drawPrices: number[] = []
    const awayPrices: number[] = []

    for (const bm of event.bookmakers) {
      const h2h = bm.markets.find((m) => m.key === "h2h")
      if (!h2h) continue
      for (const o of h2h.outcomes) {
        if (o.name === event.home_team) homePrices.push(o.price)
        else if (o.name === event.away_team) awayPrices.push(o.price)
        else if (o.name === "Draw") drawPrices.push(o.price)
      }
    }

    if (homePrices.length && drawPrices.length && awayPrices.length) {
      result[event.id] = {
        home: parseFloat(median(homePrices).toFixed(2)),
        draw: parseFloat(median(drawPrices).toFixed(2)),
        away: parseFloat(median(awayPrices).toFixed(2)),
      }
    }
  }

  return result
}
