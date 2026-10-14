// Audits that every team name we've stored for top-5 league and UEFA cup matches resolves to
// an ESPN team under the same rules settlement uses (normalizeTeamName / teamNamesLooselyMatch).
// A name that doesn't resolve means its matches will never get results — add an alias to
// TEAM_NAME_ALIASES in src/lib/apis/espn.ts before that happens.
//
// For OddsPapi-sourced competitions (UEFA cups) it also pulls upcoming fixtures, so clubs we
// haven't imported yet are checked too.
//
// Usage: npx tsx scripts/check-team-names.ts
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { LEAGUES, CUPS, type CompetitionConfig } from "../src/lib/competitions"
import { fetchFixturesForTournament } from "../src/lib/apis/oddspapi"
import { fetchEspnTeams, normalizeTeamName, teamNamesLooselyMatch, type EspnTeamInfo } from "../src/lib/apis/espn"

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) } as any)

type Resolution =
  | { kind: "exact"; espn: string }
  | { kind: "loose"; espn: string }
  | { kind: "ambiguous"; espn: string[] }
  | { kind: "missing" }

function resolve(name: string, espnTeams: EspnTeamInfo[]): Resolution {
  const key = normalizeTeamName(name)
  const exact = espnTeams.find((t) => normalizeTeamName(t.displayName) === key)
  if (exact) return { kind: "exact", espn: exact.displayName }
  const loose = [...new Set(espnTeams.filter((t) => teamNamesLooselyMatch(t.displayName, name)).map((t) => t.displayName))]
  if (loose.length === 1) return { kind: "loose", espn: loose[0] }
  if (loose.length > 1) return { kind: "ambiguous", espn: loose }
  return { kind: "missing" }
}

async function espnTeamsFor(slugs: string[]): Promise<EspnTeamInfo[]> {
  return (await Promise.all(slugs.map(fetchEspnTeams))).flat()
}

async function main() {
  const leagueTeams = await espnTeamsFor(LEAGUES.map((c) => c.espnSlug))
  let problems = 0

  for (const comp of [...LEAGUES, ...CUPS] as CompetitionConfig[]) {
    const slugs = [comp.espnSlug, ...(comp.qualifyingEspnSlug ? [comp.qualifyingEspnSlug] : [])]
    const ownTeams = await espnTeamsFor(slugs)
    // ESPN's cup team lists only cover the current season's entrants, so also accept any
    // top-5 league club for cup names.
    const pool = comp.group === "cup" ? [...ownTeams, ...leagueTeams] : ownTeams

    const matches = await db.match.findMany({ where: { competition: comp.label }, select: { homeTeam: true, awayTeam: true } })
    const upcoming = comp.source === "oddspapi" ? await fetchFixturesForTournament(comp.oddsPapiTournamentId) : []
    const names = [...new Set([...matches, ...upcoming].flatMap((m) => [m.homeTeam, m.awayTeam]))].sort()

    const rows = names.map((name) => ({ name, r: resolve(name, pool) }))
    const loose = rows.filter((x) => x.r.kind === "loose")
    const bad = rows.filter((x) => x.r.kind === "ambiguous" || x.r.kind === "missing")
    problems += bad.length

    console.log(`\n=== ${comp.label} (${slugs.join(", ")}) — ${names.length} names (${upcoming.length} upcoming fixtures), ${ownTeams.length} ESPN teams`)
    console.log(`  exact: ${rows.length - loose.length - bad.length}, loose: ${loose.length}, problems: ${bad.length}`)
    for (const { name, r } of loose) if (r.kind === "loose") console.log(`  ~ ${name}  →  ${r.espn}`)
    for (const { name, r } of bad) {
      if (r.kind === "ambiguous") console.log(`  ? ${name}  →  ambiguous: ${r.espn.join(" | ")}`)
      else console.log(`  ✗ ${name}  →  no ESPN match`)
    }

    // Clubs ESPN lists for this competition that none of our names resolve to (e.g. newly
    // promoted, or a cup entrant with no fixture yet) can't be checked — list them so a future
    // name mismatch isn't a surprise. Cup qualifying lists are skipped: most entrants are out.
    {
      const listed = comp.group === "cup" ? await fetchEspnTeams(comp.espnSlug) : ownTeams
      const unseen = listed.filter((t) => !names.some((n) => resolve(n, [t]).kind !== "missing"))
      if (unseen.length) console.log(`  · not yet in DB: ${unseen.map((t) => t.displayName).join(", ")}`)
    }
  }

  console.log(problems ? `\n${problems} name(s) won't resolve — add aliases.` : "\nAll stored names resolve.")
  process.exitCode = problems ? 1 : 0
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => db.$disconnect())
