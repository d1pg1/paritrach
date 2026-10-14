import { competitionByLabel } from "@/lib/competitions"

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"

const DEFAULT_ESPN_SLUG = "fifa.world"

export function competitionToEspnSlug(competition: string | null | undefined): string {
  return competitionByLabel(competition)?.espnSlug ?? DEFAULT_ESPN_SLUG
}

// Returns every ESPN slug a match's competition could be filed under — the main
// tournament slug plus, for UEFA cups, the separate slug their qualifying rounds use.
export function competitionToEspnSlugs(competition: string | null | undefined): string[] {
  const config = competitionByLabel(competition)
  if (!config) return [DEFAULT_ESPN_SLUG]
  return config.qualifyingEspnSlug ? [config.espnSlug, config.qualifyingEspnSlug] : [config.espnSlug]
}

export interface EspnTeamInfo {
  id: string
  displayName: string
  shortDisplayName: string
  logo: string | null
}

const espnTeamsCache = new Map<string, EspnTeamInfo[]>()

export async function fetchEspnTeams(espnSlug: string): Promise<EspnTeamInfo[]> {
  const cached = espnTeamsCache.get(espnSlug)
  if (cached) return cached

  try {
    const res = await fetch(`${ESPN_BASE}/${espnSlug}/teams`, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const data = await res.json()
    const teams: EspnTeamInfo[] = (data.sports?.[0]?.leagues?.[0]?.teams ?? []).map(
      (entry: { team: { id: string; displayName: string; shortDisplayName: string; logos?: { href: string }[] } }) => ({
        id: entry.team.id,
        displayName: entry.team.displayName,
        shortDisplayName: entry.team.shortDisplayName,
        logo: entry.team.logos?.[0]?.href ?? null,
      }),
    )
    espnTeamsCache.set(espnSlug, teams)
    return teams
  } catch {
    return []
  }
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
  // OddsPapi lists qualifying-round minnows by full/official name; ESPN uses its own
  // shorter club name for the same team.
  kuopionpalloseura: "kupskuopio",
  sabahmasazir: "sabahfk",
  // ESPN uses "F.C. København" (Danish spelling); our DB uses "FC Copenhagen"
  fckbenhavn: "copenhagen",
  fccopenhagen: "copenhagen",
  // ESPN uses "Polissya Zhitomir"; our DB uses "FC Polissya Zhytomyr"
  polissyazhitomir: "polissya",
  fcpolissyazhytomyr: "polissya",
  // The Odds API calls them "Inter Milan"; ESPN uses "Internazionale"
  intermilan: "inter",
  intermilano: "inter",
  internazionale: "inter",
  // Top-5 league clubs where The Odds API / OddsPapi and ESPN disagree on the name
  brightonandhovealbion: "brightonhovealbion",
  athleticbilbao: "athleticclub",
  realracingclubdesantander: "racingsantander",
  "1fckoln": "fccologne",
  hamburgersv: "hamburgsv",
  rennes: "staderennais",
  rccelta: "celtavigo",
  rcceltadevigo: "celtavigo",
  // UEFA cup clubs (OddsPapi name → ESPN name)
  bodoeglimt: "bodoglimt",
  agfaarhus: "agf",
  csuniversitateacraiova: "csucraiova",
  fkcrvenazvezdabelgrade: "redstarbelgrade",
  unionsaintgilloise: "unionstgilloise",
  fcsalzburg: "rbsalzburg",
  qarabagfk: "fkqarabag",
  glasgowrangers: "rangers",
  acomonianicosia: "omonianicosia",
  lillestroemsk: "lillestrom",
  tromsoeil: "tromso",
  ferencvarosibudapest: "ferencvaros",
  debrecenivsc: "debrecen",
  interclubdeescaldes: "interdescaldes",
  fcalashkertyerevan: "alashkertfc",
  fccfr1907cluj: "cfrclujnapoca",
  fccska1948: "cska1948sofia",
  fcdrita: "dritagjilan",
  fcnordsjaelland: "fcnordsjlland",
  fcilevadiatallinn: "fclevadiatallinn",
  fkaustriawien: "austriavienna",
  maxlinevitebsk: "mlvitebsk",
  bravoljubljana: "nkbravo",
  pfcludogorets1945razgrad: "ludogoretsrazgrad",
  paksifc: "paksise",
  skrapid: "rapidvienna",
  sttruidensevv: "sinttruidense",
  tampereenilves: "fcilves",
  vilniusfkzalgiris: "zalgirisvilnius",
}

// Canonical comparison key for a team name across OddsPapi / The Odds API / ESPN.
export function normalizeTeamName(s: string): string {
  // Decompose accents first so "Atlético" → "atletico" rather than "atltico".
  const key = s.normalize("NFD").toLowerCase().replace(/[^a-z0-9]/g, "")
  return TEAM_NAME_ALIASES[key] ?? key
}

// OddsPapi often carries club prefixes/suffixes ESPN drops ("Villarreal CF" vs "Villarreal",
// "SSC Napoli" vs "Napoli"), so as a fallback accept one name's words being a subset of the
// other's. Whole words only — substring matching pairs "Glasgow Rangers" with "Angers".
// Run scripts/check-team-names.ts to audit stored names against ESPN.
export function teamNamesLooselyMatch(a: string, b: string): boolean {
  const words = (s: string) => new Set(s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))
  const [small, large] = [words(a), words(b)].sort((x, y) => x.size - y.size)
  return [...small].some((w) => w.length >= 4) && [...small].every((w) => large.has(w))
}

export function findEspnEventForMatch(
  events: EspnEvent[],
  homeTeam: string,
  awayTeam: string
): EspnEvent | undefined {
  const home = normalizeTeamName(homeTeam)
  const away = normalizeTeamName(awayTeam)
  const namesOf = (e: EspnEvent) => (e.competitions[0]?.competitors ?? []).map((c) => c.team.displayName)

  const exact = events.find((e) => {
    const names = namesOf(e).map(normalizeTeamName)
    return names.includes(home) && names.includes(away)
  })
  if (exact) return exact

  // Loose fallback only when both teams match the same event and it's the sole candidate.
  const candidates = events.filter((e) => {
    const names = namesOf(e)
    return names.some((n) => teamNamesLooselyMatch(n, homeTeam)) && names.some((n) => teamNamesLooselyMatch(n, awayTeam))
  })
  return candidates.length === 1 ? candidates[0] : undefined
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

// Knockout-stage matches can end level on the scoreboard (extra time / penalties still tied
// 1-1) while ESPN's `winner` flag on the competitor identifies who actually advanced.
export function parseAdvancingTeam(event: EspnEvent): "home" | "away" | null {
  const comps = event.competitions[0]?.competitors ?? []
  const home = comps.find((c) => c.homeAway === "home")
  const away = comps.find((c) => c.homeAway === "away")
  if (home?.winner === true) return "home"
  if (away?.winner === true) return "away"
  return null
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
): Promise<{ htHomeScore: number; htAwayScore: number; rtHomeScore: number | null; rtAwayScore: number | null } | null> {
  const res = await fetch(`${ESPN_BASE}/${espnSlug}/summary?event=${eventId}`, { cache: "no-store" })
  if (!res.ok) return null
  const data: EspnSummary = await res.json()
  const comps = data.header?.competitions?.[0]?.competitors ?? []
  const home = comps.find((c) => c.homeAway === "home")
  const away = comps.find((c) => c.homeAway === "away")
  const htHomeScore = parseInt(home?.linescores?.[0]?.displayValue ?? "", 10)
  const htAwayScore = parseInt(away?.linescores?.[0]?.displayValue ?? "", 10)
  if (isNaN(htHomeScore) || isNaN(htAwayScore)) return null
  // Regular-time score = 1st-half + 2nd-half goals. If the match went to AET,
  // this is less than the final score stored in the ESPN "score" field.
  const p2Home = parseInt(home?.linescores?.[1]?.displayValue ?? "", 10)
  const p2Away = parseInt(away?.linescores?.[1]?.displayValue ?? "", 10)
  const rtHomeScore = isNaN(p2Home) ? null : htHomeScore + p2Home
  const rtAwayScore = isNaN(p2Away) ? null : htAwayScore + p2Away
  return { htHomeScore, htAwayScore, rtHomeScore, rtAwayScore }
}
