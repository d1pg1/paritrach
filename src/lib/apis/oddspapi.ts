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
interface FixtureMeta { id: string; startTime: string; homeTeam: string; awayTeam: string }
let fixtureCache: FixtureMeta[] | null = null

const FIXTURE_TOURNAMENT_IDS = [16, 851] // World Cup 2026 + International Friendlies

function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function teamNamesMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a)
  const nb = normalizeTeamName(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

async function resolveFixtureId(startTime: Date | string, homeTeam: string, awayTeam: string): Promise<string | null> {
  if (!fixtureCache) {
    const responses = await Promise.all(
      FIXTURE_TOURNAMENT_IDS.map(tid =>
        fetch(`${BASE}/v4/fixtures?tournamentId=${tid}&apiKey=${KEY}`, { next: { revalidate: 0 } })
          .then(r => r.ok ? r.json() : [])
      )
    )
    fixtureCache = (responses.flat() as { fixtureId: string; startTime: string; homeTeam: string; awayTeam: string }[]).map(f => ({
      id: f.fixtureId,
      startTime: f.startTime,
      homeTeam: f.homeTeam ?? "",
      awayTeam: f.awayTeam ?? "",
    }))
  }
  const target = new Date(startTime).getTime()
  const timeMatches = fixtureCache.filter(f => Math.abs(new Date(f.startTime).getTime() - target) < 60_000)
  if (timeMatches.length === 0) return null
  if (timeMatches.length === 1) return timeMatches[0].id

  // Multiple fixtures at same time — disambiguate by team name
  const exact = timeMatches.find(
    f => teamNamesMatch(f.homeTeam, homeTeam) && teamNamesMatch(f.awayTeam, awayTeam)
  )
  return exact?.id ?? timeMatches[0].id
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

// Median price across all bookmakers for each outcomeId.
// Median is robust against bookmakers with misclassified markets providing outlier prices.
function buildBestPriceMap(bookmakerOdds: OddsFixture["bookmakerOdds"]): Map<number, number> {
  const allPrices = new Map<number, number[]>()

  for (const bm of Object.values(bookmakerOdds)) {
    for (const market of Object.values(bm.markets)) {
      if (!market.marketActive) continue
      for (const [oidStr, outcomeData] of Object.entries(market.outcomes)) {
        const player = getPlayer(outcomeData)
        if (player?.active && player.price > 1) {
          const oid = parseInt(oidStr)
          if (!allPrices.has(oid)) allPrices.set(oid, [])
          allPrices.get(oid)!.push(player.price)
        }
      }
    }
  }

  const map = new Map<number, number>()
  for (const [oid, prices] of allPrices) {
    const sorted = [...prices].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 1
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2
    map.set(oid, median)
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

  computeDerivedMarkets(result)

  return result
}

// ── Derived / synthetic markets ───────────────────────────────────────────────

// Intervals matching the "Розширений інтервал" pattern: L ∈ {1,2,3}, H ∈ {L+1..6}
const INTERVAL_LOWER_BOUNDS = [1, 2, 3]
const INTERVAL_MAX_UPPER = 6

// Subset of intervals used for combo markets (keeps outcome count manageable)
const COMBO_INTERVALS = ["1-2", "1-3", "2-3", "2-4", "3-4"]

function buildFairOverMap(totals: OddsMarket): Map<number, number> {
  const byLine = new Map<number, { over?: number; under?: number }>()
  for (const o of totals.outcomes) {
    if (o.point === undefined) continue
    if (!byLine.has(o.point)) byLine.set(o.point, {})
    const entry = byLine.get(o.point)!
    if (o.name.startsWith("Over")) entry.over = o.price
    else if (o.name.startsWith("Under")) entry.under = o.price
  }
  const fair = new Map<number, number>()
  for (const [pt, v] of byLine) {
    if (!v.over || !v.under) continue
    const pO = 1 / v.over
    const pU = 1 / v.under
    fair.set(pt, pO / (pO + pU))
  }
  return fair
}

function computeDerivedMarkets(markets: Record<string, OddsMarket>): void {
  const totals = markets["totals"]
  const dc = markets["double_chance"]
  const h2h = markets["h2h"]

  // ── goals_interval ──────────────────────────────────────────────────────────
  if (totals) {
    const fairOver = buildFairOverMap(totals)
    // fairPOver beyond available lines → 0; below all lines (L-0.5 for L=1 → 0.5) needs fairOver(0.5)
    const getFair = (line: number) => line < 0 ? 1 : (fairOver.get(line) ?? 0)

    const intervalOutcomes: Outcome[] = []
    for (const L of INTERVAL_LOWER_BOUNDS) {
      for (let H = L + 1; H <= INTERVAL_MAX_UPPER; H++) {
        const p = getFair(L - 0.5) - getFair(H + 0.5)
        if (p < 0.02) continue
        intervalOutcomes.push({ name: `${L}-${H}`, price: parseFloat((1 / p).toFixed(2)) })
      }
    }
    if (intervalOutcomes.length >= 2) {
      markets["goals_interval"] = { key: "goals_interval", outcomes: intervalOutcomes }
    }
  }

  const intervals = markets["goals_interval"]

  // ── combo_dc_total ──────────────────────────────────────────────────────────
  if (dc && totals) {
    const keyTotals = totals.outcomes.filter(o => o.point !== undefined && [1.5, 2.5, 3.5].includes(o.point))
    const combos: Outcome[] = []
    for (const d of dc.outcomes) {
      for (const t of keyTotals) {
        combos.push({ name: `${d.name}+${t.name} ${t.point}`, price: parseFloat((d.price * t.price).toFixed(2)), point: t.point })
      }
    }
    if (combos.length > 0) markets["combo_dc_total"] = { key: "combo_dc_total", outcomes: combos }
  }

  // ── result_and_total ────────────────────────────────────────────────────────
  if (h2h && totals) {
    const keyTotals = totals.outcomes.filter(o => o.point !== undefined && [1.5, 2.5, 3.5].includes(o.point))
    const combos: Outcome[] = []
    for (const h of h2h.outcomes) {
      for (const t of keyTotals) {
        combos.push({ name: `${h.name}+${t.name} ${t.point}`, price: parseFloat((h.price * t.price).toFixed(2)), point: t.point })
      }
    }
    if (combos.length > 0) markets["result_and_total"] = { key: "result_and_total", outcomes: combos }
  }

  // ── combo_dc_interval ───────────────────────────────────────────────────────
  if (dc && intervals) {
    const subIntervals = intervals.outcomes.filter(o => COMBO_INTERVALS.includes(o.name))
    const combos: Outcome[] = []
    for (const d of dc.outcomes) {
      for (const iv of subIntervals) {
        combos.push({ name: `${d.name}+${iv.name}`, price: parseFloat((d.price * iv.price).toFixed(2)) })
      }
    }
    if (combos.length > 0) markets["combo_dc_interval"] = { key: "combo_dc_interval", outcomes: combos }
  }

  // ── combo_h2h_interval ──────────────────────────────────────────────────────
  if (h2h && intervals) {
    const subIntervals = intervals.outcomes.filter(o => COMBO_INTERVALS.includes(o.name))
    const combos: Outcome[] = []
    for (const h of h2h.outcomes) {
      for (const iv of subIntervals) {
        combos.push({ name: `${h.name}+${iv.name}`, price: parseFloat((h.price * iv.price).toFixed(2)) })
      }
    }
    if (combos.length > 0) markets["combo_h2h_interval"] = { key: "combo_h2h_interval", outcomes: combos }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

import type { H2HOdds } from "./odds-api"

export async function fetchFriendliesH2HOdds(): Promise<Record<string, H2HOdds>> {
  const [res, meta] = await Promise.all([
    fetch(`${BASE}/v4/odds-by-tournaments?tournamentIds=851&bookmaker=pinnacle&apiKey=${KEY}`, {
      next: { revalidate: 300 },
    }),
    fetchMarketMeta(),
  ])
  if (!res.ok) return {}

  interface BulkFixture {
    fixtureId: string
    bookmakerOdds: Record<string, {
      markets: Record<string, {
        marketActive: boolean
        outcomes: Record<string, { players: Record<string, { price: number }> }>
      }>
    }>
  }

  const fixtures = (await res.json()) as BulkFixture[]

  const h2hMarketIds = new Set<number>()
  for (const [id, info] of meta.markets) {
    if (info.cat === "h2h") h2hMarketIds.add(id)
  }

  const result: Record<string, H2HOdds> = {}

  for (const fixture of fixtures) {
    const pinnacle = fixture.bookmakerOdds["pinnacle"]
    if (!pinnacle) continue

    for (const [midStr, market] of Object.entries(pinnacle.markets)) {
      if (!h2hMarketIds.has(parseInt(midStr)) || !market.marketActive) continue

      let home: number | null = null
      let draw: number | null = null
      let away: number | null = null

      for (const [oidStr, outcomeData] of Object.entries(market.outcomes)) {
        const price = Object.values(outcomeData.players)[0]?.price
        if (!price || price <= 1) continue
        const name = meta.names.get(parseInt(oidStr))
        if (name === "1") home = price
        else if (name === "X") draw = price
        else if (name === "2") away = price
      }

      if (home !== null && draw !== null && away !== null) {
        result[fixture.fixtureId] = {
          home: parseFloat(home.toFixed(2)),
          draw: parseFloat(draw.toFixed(2)),
          away: parseFloat(away.toFixed(2)),
        }
        break
      }
    }
  }

  return result
}

// OddsPapi fixture IDs start with "id"; The Odds API IDs are UUIDs
function isOddsPapiFixtureId(id: string): boolean {
  return id.startsWith("id")
}

export async function extractMarketsForMatch(
  startTime: Date | string,
  homeTeam: string,
  awayTeam: string,
  externalId?: string | null,
): Promise<Record<string, OddsMarket>> {
  // Use stored fixture ID directly when available (friendlies imported from OddsPapi)
  // — avoids startTime collision when multiple matches kick off at the same time
  const directId = externalId && isOddsPapiFixtureId(externalId) ? externalId : null

  const [fixtureId, meta] = await Promise.all([
    directId ? Promise.resolve(directId) : resolveFixtureId(startTime, homeTeam, awayTeam),
    fetchMarketMeta(),
  ])
  if (!fixtureId) return {}
  const data = await fetchFixtureOdds(fixtureId)
  return extractMarkets(data.bookmakerOdds, meta, homeTeam, awayTeam)
}
