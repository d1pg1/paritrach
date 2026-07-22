import { describe, expect, it } from "vitest"
import { circleMethodRound, getPairingsForRound } from "./h2h-schedule"

function asSet(pairings: [string, string][]): Set<string> {
  return new Set(pairings.map(([a, b]) => [a, b].sort().join("|")))
}

describe("circleMethodRound", () => {
  // Draw order chosen so round 1 reproduces the brief's worked example exactly:
  // Sasha–Dima, Danya–Pasha, Darina–Selin, Kirill–Igor.
  const drawOrder = ["Sasha", "Danya", "Darina", "Kirill", "Igor", "Selin", "Pasha", "Dima"]

  it("matches the brief's round-1 example", () => {
    const round1 = circleMethodRound(drawOrder, 1)
    expect(asSet(round1)).toEqual(
      asSet([
        ["Sasha", "Dima"],
        ["Danya", "Pasha"],
        ["Darina", "Selin"],
        ["Kirill", "Igor"],
      ])
    )
  })

  it("produces N/2 pairings per round", () => {
    for (let round = 1; round <= drawOrder.length - 1; round++) {
      expect(circleMethodRound(drawOrder, round)).toHaveLength(drawOrder.length / 2)
    }
  })

  it("pairs every contestant with every other contestant exactly once across N-1 rounds", () => {
    const seen = new Map<string, number>()
    for (let round = 1; round <= drawOrder.length - 1; round++) {
      for (const [a, b] of circleMethodRound(drawOrder, round)) {
        const key = [a, b].sort().join("|")
        seen.set(key, (seen.get(key) ?? 0) + 1)
      }
    }
    const n = drawOrder.length
    expect(seen.size).toBe((n * (n - 1)) / 2)
    for (const count of seen.values()) expect(count).toBe(1)
  })

  it("rejects an odd number of contestants", () => {
    expect(() => circleMethodRound(["A", "B", "C"], 1)).toThrow()
  })

  it("rejects an out-of-range roundInCycle", () => {
    expect(() => circleMethodRound(drawOrder, 0)).toThrow()
    expect(() => circleMethodRound(drawOrder, drawOrder.length)).toThrow()
  })
})

describe("getPairingsForRound", () => {
  const drawOrder = ["Sasha", "Danya", "Darina", "Kirill", "Igor", "Selin", "Pasha", "Dima"]

  it("repeats the same N-1 round pattern identically across cycles", () => {
    const n = drawOrder.length
    for (let round = 1; round <= n - 1; round++) {
      expect(asSet(getPairingsForRound(drawOrder, round))).toEqual(
        asSet(getPairingsForRound(drawOrder, round + (n - 1)))
      )
      expect(asSet(getPairingsForRound(drawOrder, round))).toEqual(
        asSet(getPairingsForRound(drawOrder, round + 6 * (n - 1)))
      )
    }
  })

  it("covers 49 rounds / 7 cycles for N=8 with 7 meetings per pair", () => {
    const meetings = new Map<string, number>()
    for (let sequenceNumber = 1; sequenceNumber <= 49; sequenceNumber++) {
      for (const [a, b] of getPairingsForRound(drawOrder, sequenceNumber)) {
        const key = [a, b].sort().join("|")
        meetings.set(key, (meetings.get(key) ?? 0) + 1)
      }
    }
    expect(meetings.size).toBe(28)
    for (const count of meetings.values()) expect(count).toBe(7)
  })
})
