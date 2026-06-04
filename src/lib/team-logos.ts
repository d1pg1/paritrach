// Maps lowercased team name variants → logo URL.
// API-Football CDN: https://media.api-sports.io/football/teams/{id}.png (public, no auth needed)
// flagcdn.com: https://flagcdn.com/48x36/{iso2}.webp (public, no auth needed)
const RAW: [string, string][] = [
  // ─── English Premier League ──────────────────────────────────────────────
  ["ав",                  "https://media.api-sports.io/football/teams/66.png"],   // Aston Villa
  ["астон вилла",        "https://media.api-sports.io/football/teams/66.png"],
  ["арсенал",            "https://media.api-sports.io/football/teams/42.png"],
  ["борнмут",            "https://media.api-sports.io/football/teams/35.png"],
  ["вх",                 "https://media.api-sports.io/football/teams/48.png"],   // West Ham
  ["кп",                 "https://media.api-sports.io/football/teams/52.png"],   // Crystal Palace
  ["кристал пелас",      "https://media.api-sports.io/football/teams/52.png"],
  ["кристал пелес",      "https://media.api-sports.io/football/teams/52.png"],
  ["кристал пэлас",      "https://media.api-sports.io/football/teams/52.png"],
  ["лидс",               "https://media.api-sports.io/football/teams/63.png"],
  ["ливерпуль",          "https://media.api-sports.io/football/teams/40.png"],
  ["мю",                 "https://media.api-sports.io/football/teams/33.png"],   // Manchester United
  ["ман ю",              "https://media.api-sports.io/football/teams/33.png"],
  ["ман сити",           "https://media.api-sports.io/football/teams/50.png"],   // Manchester City
  ["ман сіті",           "https://media.api-sports.io/football/teams/50.png"],
  ["манчестер сити",     "https://media.api-sports.io/football/teams/50.png"],
  ["манчестер",          "https://media.api-sports.io/football/teams/33.png"],
  ["ньюкасл",            "https://media.api-sports.io/football/teams/34.png"],
  ["ньюкасал",           "https://media.api-sports.io/football/teams/34.png"],
  ["ньюксал",            "https://media.api-sports.io/football/teams/34.png"],
  ["тотенхем",           "https://media.api-sports.io/football/teams/47.png"],
  ["тотенхэм",           "https://media.api-sports.io/football/teams/47.png"],
  ["тоттенхэм",          "https://media.api-sports.io/football/teams/47.png"],
  ["ттх",                "https://media.api-sports.io/football/teams/47.png"],   // Tottenham abbrev
  ["челси",              "https://media.api-sports.io/football/teams/49.png"],
  ["чесли",              "https://media.api-sports.io/football/teams/49.png"],
  ["эвертон",            "https://media.api-sports.io/football/teams/45.png"],

  // ─── La Liga ─────────────────────────────────────────────────────────────
  ["атлетик",            "https://media.api-sports.io/football/teams/531.png"],  // Athletic Bilbao
  ["атлетик б",          "https://media.api-sports.io/football/teams/531.png"],
  ["бильбао",            "https://media.api-sports.io/football/teams/531.png"],
  ["атлетико",           "https://media.api-sports.io/football/teams/530.png"],  // Atletico Madrid
  ["атлетико б",         "https://media.api-sports.io/football/teams/530.png"],
  ["атлетико м",         "https://media.api-sports.io/football/teams/530.png"],
  ["атм",                "https://media.api-sports.io/football/teams/530.png"],
  ["барса",              "https://media.api-sports.io/football/teams/529.png"],  // Barcelona
  ["барселона",          "https://media.api-sports.io/football/teams/529.png"],
  ["бетис",              "https://media.api-sports.io/football/teams/543.png"],  // Real Betis
  ["вельяреал",          "https://media.api-sports.io/football/teams/533.png"],  // Villarreal
  ["вильяреал",          "https://media.api-sports.io/football/teams/533.png"],
  ["вильяреалл",         "https://media.api-sports.io/football/teams/533.png"],
  ["райо",               "https://media.api-sports.io/football/teams/728.png"],  // Rayo Vallecano
  ["реал",               "https://media.api-sports.io/football/teams/541.png"],  // Real Madrid
  ["реал сосьедад",      "https://media.api-sports.io/football/teams/548.png"],

  // ─── Bundesliga ──────────────────────────────────────────────────────────
  ["бавария",            "https://media.api-sports.io/football/teams/157.png"],
  ["баер",               "https://media.api-sports.io/football/teams/168.png"],  // Bayer Leverkusen
  ["бд",                 "https://media.api-sports.io/football/teams/165.png"],  // Borussia Dortmund
  ["боруссия д",         "https://media.api-sports.io/football/teams/165.png"],
  ["рбл",                "https://media.api-sports.io/football/teams/173.png"],  // RB Leipzig
  ["фрайбург",           "https://media.api-sports.io/football/teams/160.png"],
  ["штутгарт",           "https://media.api-sports.io/football/teams/172.png"],

  // ─── Serie A ─────────────────────────────────────────────────────────────
  ["ам",                 "https://media.api-sports.io/football/teams/489.png"],  // AC Milan
  ["милан",              "https://media.api-sports.io/football/teams/489.png"],
  ["аталанта",           "https://media.api-sports.io/football/teams/499.png"],
  ["интер",              "https://media.api-sports.io/football/teams/505.png"],
  ["комо",               "https://media.api-sports.io/football/teams/511.png"],
  ["лацио",              "https://media.api-sports.io/football/teams/487.png"],
  ["наполи",             "https://media.api-sports.io/football/teams/492.png"],
  ["рома",               "https://media.api-sports.io/football/teams/497.png"],
  ["ювентус",            "https://media.api-sports.io/football/teams/496.png"],

  // ─── Ligue 1 ─────────────────────────────────────────────────────────────
  ["псж",                "https://media.api-sports.io/football/teams/85.png"],
  ["лион",               "https://media.api-sports.io/football/teams/80.png"],
  ["марсель",            "https://media.api-sports.io/football/teams/81.png"],
  ["монако",             "https://media.api-sports.io/football/teams/91.png"],
  ["страсбург",          "https://media.api-sports.io/football/teams/95.png"],

  // ─── Other European clubs ─────────────────────────────────────────────────
  ["бенфика",            "https://media.api-sports.io/football/teams/211.png"],
  ["галатасарай",        "https://media.api-sports.io/football/teams/213.png"],
  ["шахтер",             "https://media.api-sports.io/football/teams/503.png"],  // Shakhtar Donetsk

  // ─── National teams (English names from The Odds API / OddsPapi imports) ─
  ["argentina",          "https://flagcdn.com/48x36/ar.webp"],
  ["australia",          "https://flagcdn.com/48x36/au.webp"],
  ["austria",            "https://flagcdn.com/48x36/at.webp"],
  ["belgium",            "https://flagcdn.com/48x36/be.webp"],
  ["bolivia",            "https://flagcdn.com/48x36/bo.webp"],
  ["brazil",             "https://flagcdn.com/48x36/br.webp"],
  ["cameroon",           "https://flagcdn.com/48x36/cm.webp"],
  ["canada",             "https://flagcdn.com/48x36/ca.webp"],
  ["chile",              "https://flagcdn.com/48x36/cl.webp"],
  ["china",              "https://flagcdn.com/48x36/cn.webp"],
  ["colombia",           "https://flagcdn.com/48x36/co.webp"],
  ["costa rica",         "https://flagcdn.com/48x36/cr.webp"],
  ["croatia",            "https://flagcdn.com/48x36/hr.webp"],
  ["czech republic",     "https://flagcdn.com/48x36/cz.webp"],
  ["denmark",            "https://flagcdn.com/48x36/dk.webp"],
  ["ecuador",            "https://flagcdn.com/48x36/ec.webp"],
  ["egypt",              "https://flagcdn.com/48x36/eg.webp"],
  ["el salvador",        "https://flagcdn.com/48x36/sv.webp"],
  ["england",            "https://flagcdn.com/48x36/gb-eng.webp"],
  ["france",             "https://flagcdn.com/48x36/fr.webp"],
  ["germany",            "https://flagcdn.com/48x36/de.webp"],
  ["ghana",              "https://flagcdn.com/48x36/gh.webp"],
  ["honduras",           "https://flagcdn.com/48x36/hn.webp"],
  ["hungary",            "https://flagcdn.com/48x36/hu.webp"],
  ["indonesia",          "https://flagcdn.com/48x36/id.webp"],
  ["iran",               "https://flagcdn.com/48x36/ir.webp"],
  ["iraq",               "https://flagcdn.com/48x36/iq.webp"],
  ["italy",              "https://flagcdn.com/48x36/it.webp"],
  ["ivory coast",        "https://flagcdn.com/48x36/ci.webp"],
  ["côte d'ivoire",      "https://flagcdn.com/48x36/ci.webp"],
  ["jamaica",            "https://flagcdn.com/48x36/jm.webp"],
  ["japan",              "https://flagcdn.com/48x36/jp.webp"],
  ["mali",               "https://flagcdn.com/48x36/ml.webp"],
  ["mexico",             "https://flagcdn.com/48x36/mx.webp"],
  ["morocco",            "https://flagcdn.com/48x36/ma.webp"],
  ["netherlands",        "https://flagcdn.com/48x36/nl.webp"],
  ["new zealand",        "https://flagcdn.com/48x36/nz.webp"],
  ["nigeria",            "https://flagcdn.com/48x36/ng.webp"],
  ["norway",             "https://flagcdn.com/48x36/no.webp"],
  ["panama",             "https://flagcdn.com/48x36/pa.webp"],
  ["paraguay",           "https://flagcdn.com/48x36/py.webp"],
  ["peru",               "https://flagcdn.com/48x36/pe.webp"],
  ["poland",             "https://flagcdn.com/48x36/pl.webp"],
  ["portugal",           "https://flagcdn.com/48x36/pt.webp"],
  ["qatar",              "https://flagcdn.com/48x36/qa.webp"],
  ["romania",            "https://flagcdn.com/48x36/ro.webp"],
  ["russia",             "https://flagcdn.com/48x36/ru.webp"],
  ["saudi arabia",       "https://flagcdn.com/48x36/sa.webp"],
  ["scotland",           "https://flagcdn.com/48x36/gb-sct.webp"],
  ["senegal",            "https://flagcdn.com/48x36/sn.webp"],
  ["serbia",             "https://flagcdn.com/48x36/rs.webp"],
  ["slovakia",           "https://flagcdn.com/48x36/sk.webp"],
  ["slovenia",           "https://flagcdn.com/48x36/si.webp"],
  ["south africa",       "https://flagcdn.com/48x36/za.webp"],
  ["south korea",        "https://flagcdn.com/48x36/kr.webp"],
  ["spain",              "https://flagcdn.com/48x36/es.webp"],
  ["sweden",             "https://flagcdn.com/48x36/se.webp"],
  ["switzerland",        "https://flagcdn.com/48x36/ch.webp"],
  ["thailand",           "https://flagcdn.com/48x36/th.webp"],
  ["trinidad and tobago","https://flagcdn.com/48x36/tt.webp"],
  ["tunisia",            "https://flagcdn.com/48x36/tn.webp"],
  ["turkey",             "https://flagcdn.com/48x36/tr.webp"],
  ["ukraine",            "https://flagcdn.com/48x36/ua.webp"],
  ["united arab emirates","https://flagcdn.com/48x36/ae.webp"],
  ["united states",      "https://flagcdn.com/48x36/us.webp"],
  ["usa",                "https://flagcdn.com/48x36/us.webp"],
  ["uruguay",            "https://flagcdn.com/48x36/uy.webp"],
  ["venezuela",          "https://flagcdn.com/48x36/ve.webp"],
  ["vietnam",            "https://flagcdn.com/48x36/vn.webp"],
  ["wales",              "https://flagcdn.com/48x36/gb-wls.webp"],
]

export const TEAM_LOGO_MAP = new Map<string, string>(RAW)

export function getTeamLogoUrl(teamName: string): string | undefined {
  return TEAM_LOGO_MAP.get(teamName.toLowerCase().trim())
}
