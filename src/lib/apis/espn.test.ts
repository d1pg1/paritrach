import { describe, it, expect } from "vitest"
import { findEspnEventForMatch, teamNamesLooselyMatch, type EspnEvent } from "./espn"

function event(id: string, home: string, away: string): EspnEvent {
  return {
    id,
    name: `${away} at ${home}`,
    date: "2026-10-13T19:00Z",
    status: { type: { name: "STATUS_FULL_TIME", completed: true } },
    competitions: [{
      competitors: [
        { homeAway: "home", team: { id: `${id}h`, displayName: home }, score: "0" },
        { homeAway: "away", team: { id: `${id}a`, displayName: away }, score: "0" },
      ],
    }],
  }
}

describe("findEspnEventForMatch", () => {
  const events = [
    event("1", "Atlético Madrid", "Manchester United"),
    event("2", "Villarreal", "Napoli"),
    event("3", "Internazionale", "Club Brugge"),
    event("4", "Brighton & Hove Albion", "FC Cologne"),
  ]

  it("matches accented ESPN names", () => {
    expect(findEspnEventForMatch(events, "Atletico Madrid", "Manchester United")?.id).toBe("1")
  })

  it("matches names with extra club prefixes/suffixes", () => {
    expect(findEspnEventForMatch(events, "Villarreal CF", "SSC Napoli")?.id).toBe("2")
  })

  it("matches via aliases", () => {
    expect(findEspnEventForMatch(events, "Inter Milano", "Club Brugge")?.id).toBe("3")
    expect(findEspnEventForMatch(events, "Brighton and Hove Albion", "1. FC Köln")?.id).toBe("4")
  })

  it("returns undefined when only one team matches", () => {
    expect(findEspnEventForMatch(events, "Manchester City", "Napoli")).toBeUndefined()
  })
})

describe("teamNamesLooselyMatch", () => {
  it("accepts word subsets", () => {
    expect(teamNamesLooselyMatch("FSV Mainz 05", "Mainz")).toBe(true)
    expect(teamNamesLooselyMatch("RKS Rakow Czestochowa", "Raków Czestochowa")).toBe(true)
  })

  it("rejects partial-word overlaps", () => {
    expect(teamNamesLooselyMatch("Glasgow Rangers", "Angers")).toBe(false)
    expect(teamNamesLooselyMatch("AC Omonia Nicosia", "Como")).toBe(false)
    expect(teamNamesLooselyMatch("Lillestroem SK", "Lille")).toBe(false)
  })

  it("ignores generic short words like FC", () => {
    expect(teamNamesLooselyMatch("FC", "FC Barcelona")).toBe(false)
  })
})
