const BASE = "https://api.oddspapi.io"
const KEY = process.env.ODDSPAPI_API_KEY!

// ── OddsPapi outcome ID → display name (from /v4/markets?sportId=10) ──────────
const OUTCOME_NAMES: Record<number, string> = {
  // h2h (101)
  101: "1", 102: "X", 103: "2",
  // btts (104)
  104: "Yes", 105: "No",
  // h2h_h1 (10208)
  10208: "1", 10209: "X", 10210: "2",
  // double_chance (101902) — OddsPapi "2X" → settlement "X2"
  101902: "1X", 101903: "12", 101904: "X2",
}

const FIXED_MARKET_IDS: Record<number, string> = {
  101: "h2h",
  104: "btts",
  10208: "h2h_h1",
  101902: "double_chance",
}

// ── Internal types ─────────────────────────────────────────────────────────────
interface OddsPlayer {
  active: boolean
  price: number
  bookmakerOutcomeId: string
}

interface OddsOutcome {
  players: Record<string, OddsPlayer>
}

interface BookmakerMarket {
  bookmakerMarketId: string
  marketActive: boolean
  outcomes: Record<string, OddsOutcome>
}

interface OddsFixture {
  fixtureId: string
  startTime: string
  bookmakerOdds: Record<string, { markets: Record<string, BookmakerMarket> }>
}

// ── Normalised types (stored in DB, read by BettingCard) ──────────────────────
export interface Outcome {
  name: string
  price: number
  point?: number
}

export interface OddsMarket {
  key: string
  outcomes: Outcome[]
}

// ── API ────────────────────────────────────────────────────────────────────────
async function fetchOdds(bookmaker: string): Promise<OddsFixture[]> {
  const url = `${BASE}/v4/odds-by-tournaments?tournamentIds=16&bookmaker=${bookmaker}&apiKey=${KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`OddsPapi (${bookmaker}) error: ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(`OddsPapi (${bookmaker}) unexpected response`)
  return data as OddsFixture[]
}

export async function fetchTournamentOdds(): Promise<{ pinnacle: OddsFixture[]; xbet: OddsFixture[] }> {
  const pinnacle = await fetchOdds("pinnacle")
  const xbet = await fetchOdds("1xbet").catch(() => [] as OddsFixture[])
  return { pinnacle, xbet }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPlayer(outcome: OddsOutcome): OddsPlayer | null {
  return Object.values(outcome.players)[0] ?? null
}

// Only X.5 lines (0.5, 1.5, 2.5 …) — filters out 1.0, 1.25, 1.75 etc.
function isHalfLine(line: number): boolean {
  return Math.abs(line % 1) === 0.5
}

// Build outcomeId → price map from ALL 1xbet markets (OddsPapi outcomeIds are shared)
function buildXbetPriceMap(markets: Record<string, BookmakerMarket>): Map<number, number> {
  const map = new Map<number, number>()
  for (const market of Object.values(markets)) {
    if (!market.marketActive) continue
    for (const [oidStr, outcomeData] of Object.entries(market.outcomes)) {
      const player = getPlayer(outcomeData)
      if (player?.active && player.price > 1) {
        map.set(parseInt(oidStr), player.price)
      }
    }
  }
  return map
}

// Parse a Pinnacle outcome into our normalised shape.
// Returns null if inactive, nonsensical price, or unparseable format.
function parsePinnacleOutcome(outcomeId: number, player: OddsPlayer): Outcome | null {
  if (!player.active || player.price <= 1) return null
  const bid = player.bookmakerOutcomeId

  // Totals: "2.5/over"
  const tot = bid.match(/^(\d+(?:\.\d+)?)\/(over|under)$/i)
  if (tot) {
    return { name: tot[2] === "over" ? "Over" : "Under", price: player.price, point: parseFloat(tot[1]) }
  }

  // Spreads: "-1.5/home", "0.0/away"
  const spr = bid.match(/^([+-]?\d+(?:\.\d+)?)\/(home|away)$/)
  if (spr) {
    return { name: spr[2] === "home" ? "1" : "2", price: player.price, point: parseFloat(spr[1]) }
  }

  // Team totals: "home/1.5/over", "away/0.5/under"
  const tm = bid.match(/^(home|away)\/(\d+(?:\.\d+)?)\/(over|under)$/i)
  if (tm) {
    return {
      name: `${tm[1]}/${tm[3] === "over" ? "Over" : "Under"}`,
      price: player.price,
      point: parseFloat(tm[2]),
    }
  }

  // Moneyline: "home", "draw", "away"
  if (bid === "home") return { name: "1", price: player.price }
  if (bid === "draw") return { name: "X", price: player.price }
  if (bid === "away") return { name: "2", price: player.price }

  // Opaque Pinnacle ID → fall back to OddsPapi outcome-name table (btts, double_chance, etc.)
  const name = OUTCOME_NAMES[outcomeId]
  if (name) return { name, price: player.price }

  return null
}

// Substitute 1xbet price when available (1xbet is primary price source)
function withXbet(o: Outcome, outcomeId: number, xbet: Map<number, number>): Outcome {
  const p = xbet.get(outcomeId)
  return p && p > 1 ? { ...o, price: p } : o
}

// ── Core extraction ────────────────────────────────────────────────────────────
function extractMarkets(
  pinnacleMarkets: Record<string, BookmakerMarket>,
  xbetPriceMap: Map<number, number>,
  homeTeam: string,
  awayTeam: string,
): Record<string, OddsMarket> {
  const result: Record<string, OddsMarket> = {}

  for (const [midStr, market] of Object.entries(pinnacleMarkets)) {
    if (!market.marketActive) continue
    const mid = parseInt(midStr)
    const bmid = market.bookmakerMarketId

    // ── Fixed markets (h2h, btts, h2h_h1, double_chance) ───────────────────
    const fixedKey = FIXED_MARKET_IDS[mid]
    if (fixedKey && !result[fixedKey]) {
      const outcomes: Outcome[] = []
      for (const [oidStr, outcomeData] of Object.entries(market.outcomes)) {
        const oid = parseInt(oidStr)
        const player = getPlayer(outcomeData)
        if (!player) continue
        const o = parsePinnacleOutcome(oid, player)
        if (o) outcomes.push(withXbet(o, oid, xbetPriceMap))
      }
      if (outcomes.length > 0) result[fixedKey] = { key: fixedKey, outcomes }
      continue
    }

    // ── Dynamic markets: skip first/second-half periods ────────────────────
    if (/\/1\//.test(bmid) || /\/2\//.test(bmid)) continue

    const isAny = bmid.startsWith("line/") || bmid.startsWith("altLine/")
    if (!isAny) continue

    // ── Totals ──────────────────────────────────────────────────────────────
    if (bmid.endsWith("/totals")) {
      const acc = result.totals?.outcomes ?? []
      for (const [oidStr, outcomeData] of Object.entries(market.outcomes)) {
        const oid = parseInt(oidStr)
        const player = getPlayer(outcomeData)
        if (!player) continue
        const o = parsePinnacleOutcome(oid, player)
        if (!o || o.point === undefined || !isHalfLine(o.point)) continue
        if (!acc.some((x) => x.name === o.name && x.point === o.point))
          acc.push(withXbet(o, oid, xbetPriceMap))
      }
      if (acc.length > 0) result.totals = { key: "totals", outcomes: acc }
      continue
    }

    // ── Spreads ─────────────────────────────────────────────────────────────
    if (bmid.endsWith("/spreads")) {
      const acc = result.spreads?.outcomes ?? []
      for (const [oidStr, outcomeData] of Object.entries(market.outcomes)) {
        const oid = parseInt(oidStr)
        const player = getPlayer(outcomeData)
        if (!player) continue
        const o = parsePinnacleOutcome(oid, player)
        if (!o || o.point === undefined || !isHalfLine(o.point)) continue
        if (!acc.some((x) => x.name === o.name && x.point === o.point))
          acc.push(withXbet(o, oid, xbetPriceMap))
      }
      if (acc.length > 0) result.spreads = { key: "spreads", outcomes: acc }
      continue
    }

    // ── Team totals ─────────────────────────────────────────────────────────
    if (bmid.endsWith("/teamTotal")) {
      const acc = result.team_totals?.outcomes ?? []
      for (const [oidStr, outcomeData] of Object.entries(market.outcomes)) {
        const oid = parseInt(oidStr)
        const player = getPlayer(outcomeData)
        if (!player) continue
        const o = parsePinnacleOutcome(oid, player)
        if (!o || o.point === undefined || !isHalfLine(o.point)) continue
        let name: string
        if (o.name.startsWith("home/")) name = `${homeTeam} ${o.name.slice(5)}`
        else if (o.name.startsWith("away/")) name = `${awayTeam} ${o.name.slice(5)}`
        else continue
        if (!acc.some((x) => x.name === name && x.point === o.point))
          acc.push(withXbet({ ...o, name }, oid, xbetPriceMap))
      }
      if (acc.length > 0) result.team_totals = { key: "team_totals", outcomes: acc }
      continue
    }
  }

  // Sort by line ascending; Over/1/home before Under/2/away within the same line
  const byLine = (a: Outcome, b: Outcome) => (a.point ?? 0) - (b.point ?? 0)
  if (result.totals) result.totals.outcomes.sort((a, b) => byLine(a, b) || (a.name === "Over" ? -1 : 1))
  if (result.spreads) result.spreads.outcomes.sort((a, b) => byLine(a, b) || (a.name === "1" ? -1 : 1))
  if (result.team_totals) result.team_totals.outcomes.sort((a, b) => {
    const aHome = a.name.startsWith(homeTeam)
    const bHome = b.name.startsWith(homeTeam)
    if (aHome !== bHome) return aHome ? -1 : 1
    return byLine(a, b) || (a.name.includes("Over") ? -1 : 1)
  })

  return result
}

// ── Public API ─────────────────────────────────────────────────────────────────
export function extractMarketsForMatch(
  data: { pinnacle: OddsFixture[]; xbet: OddsFixture[] },
  startTime: Date | string,
  homeTeam: string,
  awayTeam: string,
): Record<string, OddsMarket> {
  const target = new Date(startTime).getTime()
  const near = (f: OddsFixture) => Math.abs(new Date(f.startTime).getTime() - target) < 60_000

  const pf = data.pinnacle.find(near)
  const xf = data.xbet.find(near)

  if (!pf) return {}

  const xbetPriceMap = xf ? buildXbetPriceMap(xf.bookmakerOdds["1xbet"]?.markets ?? {}) : new Map()

  return extractMarkets(pf.bookmakerOdds.pinnacle?.markets ?? {}, xbetPriceMap, homeTeam, awayTeam)
}
