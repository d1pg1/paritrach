import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  fetchResultsByDate,
  findEspnEventForMatch,
  parseScores,
  fetchHalftimeScores,
  parseFirstGoal,
  competitionToEspnSlugs,
} from "../src/lib/apis/espn"
import { settleBet } from "../src/lib/settlement"

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) } as any)

// Manually settle all unsettled matches in all BETTING rounds
async function main() {
  const rounds = await db.round.findMany({
    where: { status: "BETTING" },
    include: {
      matches: {
        where: { isEligible: true, status: { not: "FINAL" } },
        include: { bets: { where: { isWinner: null } } },
      },
    },
  })

  const cutoff = new Date(Date.now() - 100 * 60 * 1000) // 100 min ago

  for (const round of rounds) {
    const pastMatches = round.matches.filter((m) => m.startTime <= cutoff)
    if (pastMatches.length === 0) continue

    console.log(`\nRound: ${round.name} — ${pastMatches.length} unsettled past match(es)`)

    // Fetch ESPN events for each unique date+slug
    const dateSlugPairs = [
      ...new Map(
        pastMatches.flatMap((m) => {
          const espnDate = new Date(m.startTime.getTime() - 6 * 60 * 60 * 1000)
          const date = espnDate.toISOString().slice(0, 10)
          return competitionToEspnSlugs(m.competition).map((slug) => [`${date}|${slug}`, { date, slug }] as const)
        })
      ).values(),
    ]

    const eventsBySlug = await Promise.all(
      dateSlugPairs.map(async ({ date, slug }) => {
        console.log(`  Fetching ESPN ${slug} on ${date}`)
        return { slug, events: await fetchResultsByDate(new Date(date), slug) }
      })
    )
    const allEvents = eventsBySlug.flatMap((e) => e.events)
    const slugByEventId = new Map(eventsBySlug.flatMap(({ slug, events }) => events.map((e) => [e.id, slug] as const)))

    console.log(`  Found ${allEvents.length} ESPN events`)

    for (const match of pastMatches) {
      const event = findEspnEventForMatch(allEvents, match.homeTeam, match.awayTeam)
      if (!event) {
        console.log(`  ✗ No ESPN event found for: ${match.homeTeam} vs ${match.awayTeam}`)
        continue
      }

      const { homeScore, awayScore, completed } = parseScores(event)
      if (!completed) {
        console.log(`  ⏳ Not completed yet: ${match.homeTeam} vs ${match.awayTeam}`)
        continue
      }

      const slug = slugByEventId.get(event.id) ?? competitionToEspnSlugs(match.competition)[0]
      const halftime = await fetchHalftimeScores(event.id, slug)
      const firstGoal = parseFirstGoal(event)

      const rtHomeScore = halftime?.rtHomeScore ?? null
      const rtAwayScore = halftime?.rtAwayScore ?? null

      await db.match.update({
        where: { id: match.id },
        data: {
          homeScore,
          awayScore,
          status: "FINAL",
          ...(halftime && {
            htHomeScore: halftime.htHomeScore,
            htAwayScore: halftime.htAwayScore,
            ...(rtHomeScore !== null && { rtHomeScore }),
            ...(rtAwayScore !== null && { rtAwayScore }),
          }),
        },
      })

      const rtLabel = rtHomeScore !== null && (rtHomeScore !== homeScore || rtAwayScore !== awayScore)
        ? ` (RT: ${rtHomeScore}:${rtAwayScore})`
        : ""
      console.log(`  ✓ ${match.homeTeam} ${homeScore}:${awayScore} ${match.awayTeam}${rtLabel}`)

      let settled = 0
      for (const bet of match.bets) {
        const won = settleBet({
          marketType: bet.marketType,
          selection: bet.selection,
          line: bet.line,
          homeScore,
          awayScore,
          htHomeScore: halftime?.htHomeScore ?? null,
          htAwayScore: halftime?.htAwayScore ?? null,
          rtHomeScore,
          rtAwayScore,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          firstGoalTeam: firstGoal?.firstTeam ?? null,
        })
        if (won !== null) {
          await db.bet.update({ where: { id: bet.id }, data: { isWinner: won } })
          settled++
        }
      }
      console.log(`    Settled ${settled}/${match.bets.length} bets`)
    }

    // Update round status if all matches done
    const remaining = await db.match.count({
      where: { roundId: round.id, isEligible: true, status: { not: "FINAL" } },
    })
    if (remaining === 0) {
      await db.round.update({ where: { id: round.id }, data: { status: "RESULTS" } })
      console.log(`  → Round "${round.name}" marked RESULTS`)
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect())
