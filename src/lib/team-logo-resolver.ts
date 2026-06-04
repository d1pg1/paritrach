import countries from "i18n-iso-countries"
import en from "i18n-iso-countries/langs/en.json"
import { db } from "@/lib/db"

countries.registerLocale(en)

// Names that i18n-iso-countries doesn't know but are used by sports APIs
const COUNTRY_ALIASES: Record<string, string> = {
  "england":                   "gb-eng",
  "scotland":                  "gb-sct",
  "wales":                     "gb-wls",
  "northern ireland":          "gb-nir",
  "china pr":                  "cn",
  "korea republic":            "kr",
  "ir iran":                   "ir",
  "türkiye":                   "tr",
  "turkiye":                   "tr",
  "turkey":                    "tr",
  "curacao":                   "cw",
  "cape verde":                "cv",
  "dr congo":                  "cd",
  "congo dr":                  "cd",
  "trinidad & tobago":         "tt",
  "usa":                       "us",
  "syria":                     "sy",
  "moldova":                   "md",
  "czech republic":            "cz",
  "czechia":                   "cz",
  "bosnia & herzegovina":      "ba",
  "bosnia and herzegovina":    "ba",
  "republic of ireland":       "ie",
  "côte d'ivoire":             "ci",
  "ivory coast":               "ci",
  "north macedonia":           "mk",
  "trinidad and tobago":       "tt",
  "democratic republic of congo": "cd",
  "korea dpr":                 "kp",
  "chinese taipei":            "tw",
  "palestine":                 "ps",
  "kosovo":                    "xk",
}

function getFlagUrl(name: string): string | null {
  const lower = name.toLowerCase().trim()
  if (COUNTRY_ALIASES[lower]) {
    return `https://flagcdn.com/48x36/${COUNTRY_ALIASES[lower]}.webp`
  }
  const iso = countries.getAlpha2Code(name, "en")?.toLowerCase()
  return iso ? `https://flagcdn.com/48x36/${iso}.webp` : null
}

async function fetchFromTheSportsDB(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(name)}`,
      { next: { revalidate: 86400 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    return (data?.teams?.[0]?.strTeamBadge as string | undefined) ?? null
  } catch {
    return null
  }
}

async function resolveLogoUrl(name: string): Promise<string | null> {
  return getFlagUrl(name) ?? fetchFromTheSportsDB(name)
}

export async function ensureTeamLogos(names: string[]): Promise<void> {
  const unique = [...new Set(names)]
  const existing = new Set(
    (await db.team.findMany({ where: { name: { in: unique } }, select: { name: true } })).map(
      (t) => t.name,
    ),
  )
  const missing = unique.filter((n) => !existing.has(n))
  if (!missing.length) return

  await Promise.all(
    missing.map(async (name) => {
      const logoUrl = await resolveLogoUrl(name)
      await db.team
        .create({ data: { name, logoUrl } })
        .catch(() => {}) // ignore race-condition duplicates
    }),
  )
}

export async function getTeamLogoMap(names: string[]): Promise<Record<string, string>> {
  const teams = await db.team.findMany({
    where: { name: { in: names }, logoUrl: { not: null } },
    select: { name: true, logoUrl: true },
  })
  return Object.fromEntries(teams.map((t) => [t.name.toLowerCase(), t.logoUrl!]))
}
