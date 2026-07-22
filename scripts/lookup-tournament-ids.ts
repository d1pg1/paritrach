// One-off helper: find OddsPapi tournamentIds for the new season's competitions.
// Run with: npx tsx scripts/lookup-tournament-ids.ts
import "dotenv/config"

const TARGETS = [
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Champions League",
  "Europa League",
  "Conference League",
]

async function main() {
  const key = process.env.ODDSPAPI_API_KEY
  if (!key) throw new Error("ODDSPAPI_API_KEY not set")

  const res = await fetch(`https://api.oddspapi.io/v4/tournaments?sportId=10&apiKey=${key}`)
  if (!res.ok) throw new Error(`OddsPapi tournaments error: ${res.status}`)
  const data = (await res.json()) as Array<{
    tournamentId: number
    tournamentSlug: string
    tournamentName: string
    categorySlug: string
    categoryName: string
  }>

  for (const target of TARGETS) {
    const matches = data.filter((t) =>
      t.tournamentName.toLowerCase().includes(target.toLowerCase())
    )
    console.log(`\n=== ${target} ===`)
    for (const m of matches) {
      console.log(`  tournamentId=${m.tournamentId}  "${m.tournamentName}"  category=${m.categoryName} (${m.categorySlug})`)
    }
    if (matches.length === 0) console.log("  (no match found)")
  }
}

main()
