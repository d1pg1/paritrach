import { describe, expect, it } from "vitest"
import { countCorrectByUser, scorePairing, scoreRoundPairings } from "./h2h-scoring"

describe("scorePairing", () => {
  it("awards 3/0 to the side with more correct picks", () => {
    expect(scorePairing(3, 2)).toEqual([3, 0])
    expect(scorePairing(1, 0)).toEqual([3, 0])
    expect(scorePairing(0, 1)).toEqual([0, 3])
  })

  it("splits 1/1 on a tie, including 0-0", () => {
    expect(scorePairing(2, 2)).toEqual([1, 1])
    expect(scorePairing(0, 0)).toEqual([1, 1])
  })

  it("a 3-2 loss nets 0, per the brief", () => {
    expect(scorePairing(2, 3)).toEqual([0, 3])
  })
})

describe("countCorrectByUser", () => {
  it("counts only isWinner === true, treating missing/pending bets as 0", () => {
    const counts = countCorrectByUser([
      { userId: "a", isWinner: true },
      { userId: "a", isWinner: true },
      { userId: "a", isWinner: false },
      { userId: "b", isWinner: null },
    ])
    expect(counts.get("a")).toBe(2)
    expect(counts.get("b")).toBeUndefined()
  })
})

describe("scoreRoundPairings", () => {
  it("scores both sides of every pairing, missing bets counting as 0", () => {
    const pairings: [string, string][] = [["a", "b"], ["c", "d"]]
    const correctByUser = new Map([["a", 2], ["b", 1], ["c", 0]]) // d has no bets at all
    const scored = scoreRoundPairings(pairings, correctByUser)

    expect(scored.get("a")).toEqual({ opponentId: "b", yourCorrect: 2, theirCorrect: 1, points: 3 })
    expect(scored.get("b")).toEqual({ opponentId: "a", yourCorrect: 1, theirCorrect: 2, points: 0 })
    expect(scored.get("c")).toEqual({ opponentId: "d", yourCorrect: 0, theirCorrect: 0, points: 1 })
    expect(scored.get("d")).toEqual({ opponentId: "c", yourCorrect: 0, theirCorrect: 0, points: 1 })
  })
})
