const BASE = "https://api.oddspapi.io"
const KEY = process.env.ODDSPAPI_API_KEY!

// ── Market name → category ─────────────────────────────────────────────────────
// Maps OddsPapi's marketName to our internal key + which team side (0=N/A, 1=home, 2=away)
const MARKET_CATEGORY: Record<string, { cat: string; team: 0 | 1 | 2 }> = {
  "Full Time Result":        { cat: "h2h",           team: 0 },
  "Both Teams To Score":     { cat: "btts",          team: 0 },
  "Double Chance Full Time": { cat: "double_chance", team: 0 },
  "First Half Result":       { cat: "h2h_h1",        team: 0 },
  "First Goal Full Time":    { cat: "first_goal",    team: 0 },
  "Over Under Full Time":    { cat: "totals",        team: 0 },
  "Asian Handicap":          { cat: "spreads",       team: 0 },
  "Over Under Team 1":       { cat: "team_totals",   team: 1 },
  "Over Under Team 2":       { cat: "team_totals",   team: 2 },
  "Correct Score Full Time": { cat: "correct_score", team: 0 },
}

// OddsPapi names "2X"; our settlement expects "X2"
const OUTCOME_NAME_OVERRIDES: Record<number, string> = { 101904: "X2" }

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

// ── Market metadata cache ──────────────────────────────────────────────────────
interface MarketInfo { cat: string; team: 0 | 1 | 2; handicap: number }

interface MarketMeta {
  names: Map<number, string>      // outcomeId → display name
  markets: Map<number, MarketInfo> // marketId → category + team side + handicap
}

let marketMetaCache: MarketMeta | null = null

async function fetchMarketMeta(): Promise<MarketMeta> {
  if (marketMetaCache) return marketMetaCache

  const url = `${BASE}/v4/markets?sportId=10&apiKey=${KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`OddsPapi markets error: ${res.status}`)

  const data = (await res.json()) as Array<{
    marketId: number
    marketName: string
    handicap: number | null
    outcomes: Array<{ outcomeId: number; outcomeName: string }>
  }>

  const names = new Map<number, string>()
  const markets = new Map<number, MarketInfo>()

  for (const market of data) {
    const def = MARKET_CATEGORY[market.marketName]
    if (!def) continue

    markets.set(market.marketId, {
      cat: def.cat,
      team: def.team,
      handicap: market.handicap ?? 0,
    })

    for (const outcome of market.outcomes) {
      if (!names.has(outcome.outcomeId)) {
        names.set(
          outcome.outcomeId,
          OUTCOME_NAME_OVERRIDES[outcome.outcomeId] ?? outcome.outcomeName,
        )
      }
    }
  }

  marketMetaCache = { names, markets }
  return marketMetaCache
}

// ── Fixture cache ──────────────────────────────────────────────────────────────
interface FixtureMeta { id: string; startTime: string }
let fixtureCache: FixtureMeta[] | null = null

async function resolveFixtureId(startTime: Date | string): Promise<string | null> {
  if (!fixtureCache) {
    const url = `${BASE}/v4/fixtures?tournamentId=16&apiKey=${KEY}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`OddsPapi fixtures error: ${res.status}`)
    const data = await res.json()
    fixtureCache = Array.isArray(data)
      ? data.map((f: { fixtureId: string; startTime: string }) => ({
          id: f.fixtureId,
          startTime: f.startTime,
        }))
      : []
  }
  const target = new Date(startTime).getTime()
  const found = fixtureCache.find(f => Math.abs(new Date(f.startTime).getTime() - target) < 60_000)
  return found?.id ?? null
}

// ── API ────────────────────────────────────────────────────────────────────────
async function fetchFixtureOdds(fixtureId: string): Promise<OddsFixture> {
  const url = `${BASE}/v4/odds?fixtureId=${fixtureId}&apiKey=${KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`OddsPapi odds error: ${res.status}`)
  return res.json() as Promise<OddsFixture>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPlayer(outcome: OddsOutcome): OddsPlayer | null {
  return Object.values(outcome.players)[0] ?? null
}

// Only X.5 lines (0.5, 1.5, 2.5 …) — filters out 1.0, 1.25, 1.75 etc.
function isHalfLine(line: number): boolean {
  return Math.abs(line % 1) === 0.5
}

// Best price across all bookmakers for each outcomeId
function buildBestPriceMap(bookmakerOdds: OddsFixture["bookmakerOdds"]): Map<number, number> {
  const map = new Map<number, number>()
  for (const bm of Object.values(bookmakerOdds)) {
    for (const market of Object.values(bm.markets)) {
      if (!market.marketActive) continue
      for (const [oidStr, outcomeData] of Object.entries(market.outcomes)) {
        const player = getPlayer(outcomeData)
        if (player?.active && player.price > 1) {
          const oid = parseInt(oidStr)
          const existing = map.get(oid)
          if (existing === undefined || player.price > existing) map.set(oid, player.price)
        }
      }
    }
  }
  return map
}

// ── Core extraction ────────────────────────────────────────────────────────────
const LINE_CATS = new Set(["totals", "spreads", "team_totals"])

function extractMarkets(
  allBookmakerOdds: OddsFixture["bookmakerOdds"],
  meta: MarketMeta,
  homeTeam: string,
  awayTeam: string,
): Record<string, OddsMarket> {
  const bestPriceMap = buildBestPriceMap(allBookmakerOdds)
  const result: Record<string, OddsMarket> = {}
  const seen: Record<string, Set<string>> = {}

  for (const bm of Object.values(allBookmakerOdds)) {
    for (const [midStr, market] of Object.entries(bm.markets)) {
      if (!market.marketActive) continue

      const info = meta.markets.get(parseInt(midStr))
      if (!info) continue

      const { cat, team, handicap } = info
      const isLineBased = LINE_CATS.has(cat)

      // Filter out non-.5 lines for line-based markets
      if (isLineBased && !isHalfLine(handicap)) continue

      if (!seen[cat]) seen[cat] = new Set()
      if (!result[cat]) result[cat] = { key: cat, outcomes: [] }

      for (const [oidStr, outcomeData] of Object.entries(market.outcomes)) {
        const oid = parseInt(oidStr)
        const player = getPlayer(outcomeData)
        if (!player?.active || player.price <= 1) continue

        const rawName = meta.names.get(oid)
        if (!rawName) continue

        // Resolve team name for team_totals
        let name = rawName
        if (cat === "team_totals") {
          name = `${team === 1 ? homeTeam : awayTeam} ${rawName}`
        }

        const dedupeKey = isLineBased ? `${name}|${handicap}` : name
        if (seen[cat].has(dedupeKey)) continue
        seen[cat].add(dedupeKey)

        const price = bestPriceMap.get(oid) ?? player.price
        const outcome: Outcome = isLineBased
          ? { name, price, point: handicap }
          : { name, price }

        result[cat].outcomes.push(outcome)
      }
    }
  }

  // Sort outcomes
  const byLine = (a: Outcome, b: Outcome) => (a.point ?? 0) - (b.point ?? 0)

  if (result.h2h) {
    const order = ["1", "X", "2"]
    result.h2h.outcomes.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
  }
  if (result.totals) result.totals.outcomes.sort((a, b) => byLine(a, b) || (a.name === "Over" ? -1 : 1))
  if (result.spreads) result.spreads.outcomes.sort((a, b) => byLine(a, b) || (a.name === "1" ? -1 : 1))
  if (result.team_totals) result.team_totals.outcomes.sort((a, b) => {
    const aHome = a.name.startsWith(homeTeam)
    const bHome = b.name.startsWith(homeTeam)
    if (aHome !== bHome) return aHome ? -1 : 1
    return byLine(a, b) || (a.name.includes("Over") ? -1 : 1)
  })
  if (result.correct_score) result.correct_score.outcomes.sort((a, b) => {
    const [ah, aa] = a.name.split(":").map(Number)
    const [bh, ba] = b.name.split(":").map(Number)
    return (ah + aa) - (bh + ba) || ah - bh
  })

  return result
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function extractMarketsForMatch(
  startTime: Date | string,
  homeTeam: string,
  awayTeam: string,
): Promise<Record<string, OddsMarket>> {
  // Resolve fixture ID and fetch market catalog in parallel (both cached after first call)
  const [fixtureId, meta] = await Promise.all([resolveFixtureId(startTime), fetchMarketMeta()])
  if (!fixtureId) return {}
  const data = await fetchFixtureOdds(fixtureId)
  return extractMarkets(data.bookmakerOdds, meta, homeTeam, awayTeam)
}
