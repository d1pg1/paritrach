export type CompetitionGroup = "league" | "cup" | "legacy"

// Which provider to pull fixtures from at import time. The Odds API only turns a competition
// "on" once its markets are close to opening (e.g. domestic leagues ~1 month out), so cup
// competitions — sitting in a qualifying phase for months before the group/league stage —
// show zero events there even though real, oddsful fixtures already exist on OddsPapi under
// the same tournament ID.
export type FixtureSource = "odds-api" | "oddspapi"

export interface CompetitionConfig {
  label: string
  group: CompetitionGroup
  source: FixtureSource
  oddsApiSportKey: string
  oddsPapiTournamentId: number
  espnSlug: string
  // UEFA cups run their qualifying rounds under a separate ESPN league slug from the
  // main tournament (e.g. "uefa.champions_qual" vs "uefa.champions"). Ties in that phase
  // never show up on the main slug's scoreboard, so results/live-scores must also check here.
  qualifyingEspnSlug?: string
}

export const COMPETITIONS: CompetitionConfig[] = [
  { label: "Premier League", group: "league", source: "odds-api", oddsApiSportKey: "soccer_epl", oddsPapiTournamentId: 17, espnSlug: "eng.1" },
  { label: "La Liga", group: "league", source: "odds-api", oddsApiSportKey: "soccer_spain_la_liga", oddsPapiTournamentId: 8, espnSlug: "esp.1" },
  { label: "Serie A", group: "league", source: "odds-api", oddsApiSportKey: "soccer_italy_serie_a", oddsPapiTournamentId: 23, espnSlug: "ita.1" },
  { label: "Bundesliga", group: "league", source: "odds-api", oddsApiSportKey: "soccer_germany_bundesliga", oddsPapiTournamentId: 35, espnSlug: "ger.1" },
  { label: "Ligue 1", group: "league", source: "odds-api", oddsApiSportKey: "soccer_france_ligue_one", oddsPapiTournamentId: 34, espnSlug: "fra.1" },
  { label: "UEFA Champions League", group: "cup", source: "oddspapi", oddsApiSportKey: "soccer_uefa_champs_league", oddsPapiTournamentId: 7, espnSlug: "uefa.champions", qualifyingEspnSlug: "uefa.champions_qual" },
  { label: "UEFA Europa League", group: "cup", source: "oddspapi", oddsApiSportKey: "soccer_uefa_europa_league", oddsPapiTournamentId: 679, espnSlug: "uefa.europa", qualifyingEspnSlug: "uefa.europa_qual" },
  { label: "UEFA Europa Conference League", group: "cup", source: "oddspapi", oddsApiSportKey: "soccer_uefa_europa_conference_league", oddsPapiTournamentId: 34480, espnSlug: "uefa.europa.conf", qualifyingEspnSlug: "uefa.europa.conf_qual" },
  // Legacy — not offered by any import button. Kept so historical World Cup/friendly matches
  // still resolve to the right ESPN slug / OddsPapi tournament for results, settlement, and
  // detailed-odds lookups.
  { label: "FIFA World Cup 2026", group: "legacy", source: "odds-api", oddsApiSportKey: "soccer_fifa_world_cup", oddsPapiTournamentId: 16, espnSlug: "fifa.world" },
  { label: "International Friendlies", group: "legacy", source: "oddspapi", oddsApiSportKey: "", oddsPapiTournamentId: 851, espnSlug: "fifa.friendly" },
]

export const LEAGUES = COMPETITIONS.filter((c) => c.group === "league")
export const CUPS = COMPETITIONS.filter((c) => c.group === "cup")

export function competitionByLabel(label: string | null | undefined): CompetitionConfig | undefined {
  return COMPETITIONS.find((c) => c.label === label)
}
