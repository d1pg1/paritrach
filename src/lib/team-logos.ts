// Fallback map for Ukrainian club name variants used in historical data.
// New imports (English team names) are resolved automatically via DB + team-logo-resolver.ts.
// API-Football CDN URLs are public and require no authentication.
const RAW: [string, string][] = [
  // ─── English Premier League ──────────────────────────────────────────────
  ["ав",              "https://media.api-sports.io/football/teams/66.png"],   // Aston Villa
  ["астон вилла",     "https://media.api-sports.io/football/teams/66.png"],
  ["арсенал",         "https://media.api-sports.io/football/teams/42.png"],
  ["борнмут",         "https://media.api-sports.io/football/teams/35.png"],
  ["вх",              "https://media.api-sports.io/football/teams/48.png"],   // West Ham
  ["кп",              "https://media.api-sports.io/football/teams/52.png"],   // Crystal Palace
  ["кристал пелас",   "https://media.api-sports.io/football/teams/52.png"],
  ["кристал пелес",   "https://media.api-sports.io/football/teams/52.png"],
  ["кристал пэлас",   "https://media.api-sports.io/football/teams/52.png"],
  ["лидс",            "https://media.api-sports.io/football/teams/63.png"],
  ["ливерпуль",       "https://media.api-sports.io/football/teams/40.png"],
  ["мю",              "https://media.api-sports.io/football/teams/33.png"],   // Manchester United
  ["ман ю",           "https://media.api-sports.io/football/teams/33.png"],
  ["ман сити",        "https://media.api-sports.io/football/teams/50.png"],   // Manchester City
  ["ман сіті",        "https://media.api-sports.io/football/teams/50.png"],
  ["манчестер сити",  "https://media.api-sports.io/football/teams/50.png"],
  ["манчестер",       "https://media.api-sports.io/football/teams/33.png"],
  ["ньюкасл",         "https://media.api-sports.io/football/teams/34.png"],
  ["ньюкасал",        "https://media.api-sports.io/football/teams/34.png"],
  ["ньюксал",         "https://media.api-sports.io/football/teams/34.png"],
  ["тотенхем",        "https://media.api-sports.io/football/teams/47.png"],
  ["тотенхэм",        "https://media.api-sports.io/football/teams/47.png"],
  ["тоттенхэм",       "https://media.api-sports.io/football/teams/47.png"],
  ["ттх",             "https://media.api-sports.io/football/teams/47.png"],
  ["челси",           "https://media.api-sports.io/football/teams/49.png"],
  ["чесли",           "https://media.api-sports.io/football/teams/49.png"],
  ["эвертон",         "https://media.api-sports.io/football/teams/45.png"],

  // ─── La Liga ─────────────────────────────────────────────────────────────
  ["атлетик",         "https://media.api-sports.io/football/teams/531.png"],  // Athletic Bilbao
  ["атлетик б",       "https://media.api-sports.io/football/teams/531.png"],
  ["бильбао",         "https://media.api-sports.io/football/teams/531.png"],
  ["атлетико",        "https://media.api-sports.io/football/teams/530.png"],  // Atletico Madrid
  ["атлетико б",      "https://media.api-sports.io/football/teams/530.png"],
  ["атлетико м",      "https://media.api-sports.io/football/teams/530.png"],
  ["атм",             "https://media.api-sports.io/football/teams/530.png"],
  ["барса",           "https://media.api-sports.io/football/teams/529.png"],  // Barcelona
  ["барселона",       "https://media.api-sports.io/football/teams/529.png"],
  ["бетис",           "https://media.api-sports.io/football/teams/543.png"],
  ["вельяреал",       "https://media.api-sports.io/football/teams/533.png"],  // Villarreal
  ["вильяреал",       "https://media.api-sports.io/football/teams/533.png"],
  ["вильяреалл",      "https://media.api-sports.io/football/teams/533.png"],
  ["райо",            "https://media.api-sports.io/football/teams/728.png"],  // Rayo Vallecano
  ["реал",            "https://media.api-sports.io/football/teams/541.png"],  // Real Madrid
  ["реал сосьедад",   "https://media.api-sports.io/football/teams/548.png"],

  // ─── Bundesliga ──────────────────────────────────────────────────────────
  ["бавария",         "https://media.api-sports.io/football/teams/157.png"],
  ["баер",            "https://media.api-sports.io/football/teams/168.png"],  // Bayer Leverkusen
  ["бд",              "https://media.api-sports.io/football/teams/165.png"],  // Borussia Dortmund
  ["боруссия д",      "https://media.api-sports.io/football/teams/165.png"],
  ["рбл",             "https://media.api-sports.io/football/teams/173.png"],  // RB Leipzig
  ["фрайбург",        "https://media.api-sports.io/football/teams/160.png"],
  ["штутгарт",        "https://media.api-sports.io/football/teams/172.png"],

  // ─── Serie A ─────────────────────────────────────────────────────────────
  ["ам",              "https://media.api-sports.io/football/teams/489.png"],  // AC Milan
  ["милан",           "https://media.api-sports.io/football/teams/489.png"],
  ["аталанта",        "https://media.api-sports.io/football/teams/499.png"],
  ["интер",           "https://media.api-sports.io/football/teams/505.png"],
  ["комо",            "https://media.api-sports.io/football/teams/511.png"],
  ["лацио",           "https://media.api-sports.io/football/teams/487.png"],
  ["наполи",          "https://media.api-sports.io/football/teams/492.png"],
  ["рома",            "https://media.api-sports.io/football/teams/497.png"],
  ["ювентус",         "https://media.api-sports.io/football/teams/496.png"],

  // ─── Ligue 1 ─────────────────────────────────────────────────────────────
  ["псж",             "https://media.api-sports.io/football/teams/85.png"],
  ["лион",            "https://media.api-sports.io/football/teams/80.png"],
  ["марсель",         "https://media.api-sports.io/football/teams/81.png"],
  ["монако",          "https://media.api-sports.io/football/teams/91.png"],
  ["страсбург",       "https://media.api-sports.io/football/teams/95.png"],

  // ─── Other European clubs ─────────────────────────────────────────────────
  ["бенфика",         "https://media.api-sports.io/football/teams/211.png"],
  ["галатасарай",     "https://media.api-sports.io/football/teams/213.png"],
  ["шахтер",          "https://media.api-sports.io/football/teams/503.png"],  // Shakhtar Donetsk
]

export const TEAM_LOGO_MAP = new Map<string, string>(RAW)

export function getTeamLogoUrl(teamName: string): string | undefined {
  return TEAM_LOGO_MAP.get(teamName.toLowerCase().trim())
}
