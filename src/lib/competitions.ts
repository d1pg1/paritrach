export type CompetitionGroup = "league" | "cup" | "legacy"

export interface CompetitionConfig {
  label: string
  group: CompetitionGroup
  oddsApiSportKey: string
  oddsPapiTournamentId: number
  espnSlug: string
}

export const COMPETITIONS: CompetitionConfig[] = [
  { label: "Premier League", group: "league", oddsApiSportKey: "soccer_epl", oddsPapiTournamentId: 17, espnSlug: "eng.1" },
  { label: "La Liga", group: "league", oddsApiSportKey: "soccer_spain_la_liga", oddsPapiTournamentId: 8, espnSlug: "esp.1" },
  { label: "Serie A", group: "league", oddsApiSportKey: "soccer_italy_serie_a", oddsPapiTournamentId: 23, espnSlug: "ita.1" },
  { label: "Bundesliga", group: "league", oddsApiSportKey: "soccer_germany_bundesliga", oddsPapiTournamentId: 35, espnSlug: "ger.1" },
  { label: "Ligue 1", group: "league", oddsApiSportKey: "soccer_france_ligue_one", oddsPapiTournamentId: 34, espnSlug: "fra.1" },
  { label: "UEFA Champions League", group: "cup", oddsApiSportKey: "soccer_uefa_champs_league", oddsPapiTournamentId: 7, espnSlug: "uefa.champions" },
  { label: "UEFA Europa League", group: "cup", oddsApiSportKey: "soccer_uefa_europa_league", oddsPapiTournamentId: 679, espnSlug: "uefa.europa" },
  { label: "UEFA Europa Conference League", group: "cup", oddsApiSportKey: "soccer_uefa_europa_conference_league", oddsPapiTournamentId: 34480, espnSlug: "uefa.europa.conf" },
  // Legacy — not offered by any import button. Kept so historical World Cup/friendly matches
  // still resolve to the right ESPN slug / OddsPapi tournament for results, settlement, and
  // detailed-odds lookups.
  { label: "FIFA World Cup 2026", group: "legacy", oddsApiSportKey: "soccer_fifa_world_cup", oddsPapiTournamentId: 16, espnSlug: "fifa.world" },
  { label: "International Friendlies", group: "legacy", oddsApiSportKey: "", oddsPapiTournamentId: 851, espnSlug: "fifa.friendly" },
]

export const LEAGUES = COMPETITIONS.filter((c) => c.group === "league")
export const CUPS = COMPETITIONS.filter((c) => c.group === "cup")

export function competitionByLabel(label: string | null | undefined): CompetitionConfig | undefined {
  return COMPETITIONS.find((c) => c.label === label)
}
