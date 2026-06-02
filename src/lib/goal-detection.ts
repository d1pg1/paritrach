import { db } from "@/lib/db"
import { findApiFootballFixtureId, fetchGoalEvents } from "@/lib/apis/api-football"

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "")

interface MatchSnapshot {
  id: string
  homeTeam: string
  awayTeam: string
  startTime: Date
  apiFootballId: number | null
}

export async function handleGoalDetected(
  match: MatchSnapshot,
  newHomeScore: number,
  newAwayScore: number
): Promise<void> {
  let fixtureId = match.apiFootballId

  if (!fixtureId) {
    const date = match.startTime.toISOString().slice(0, 10)
    fixtureId = await findApiFootballFixtureId(match.homeTeam, match.awayTeam, date)
    if (fixtureId) {
      await db.match.update({ where: { id: match.id }, data: { apiFootballId: fixtureId } })
    }
  }

  const upsertEvents = fixtureId
    ? fetchGoalEvents(fixtureId).then((events) =>
        Promise.all(
          events.map((ev) => {
            const team = norm(ev.teamName) === norm(match.homeTeam) ? "home" : "away"
            return db.matchEvent.upsert({
              where: { matchId_minute_team: { matchId: match.id, minute: ev.minute, team } },
              create: { matchId: match.id, minute: ev.minute, team, scorerName: ev.scorerName, eventType: ev.eventType },
              update: {},
            })
          })
        )
      )
    : Promise.resolve()

  await Promise.all([
    upsertEvents,
    db.match.update({ where: { id: match.id }, data: { liveHomeScore: newHomeScore, liveAwayScore: newAwayScore } }),
  ])
}
