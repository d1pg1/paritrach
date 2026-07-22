// Round-robin scheduling for the head-to-head season format, via the standard
// "circle method": fix drawOrder[0], rotate the remaining N-1 contestants one step
// per round. After N-1 rounds every contestant has met every other contestant once.
// A season repeats that N-1 round pattern identically across cycles (no reshuffling).

export function circleMethodRound(drawOrder: string[], roundInCycle: number): [string, string][] {
  const n = drawOrder.length
  if (n < 2 || n % 2 !== 0) {
    throw new Error(`circleMethodRound requires an even number of contestants, got ${n}`)
  }
  if (!Number.isInteger(roundInCycle) || roundInCycle < 1 || roundInCycle > n - 1) {
    throw new Error(`roundInCycle must be an integer between 1 and ${n - 1}, got ${roundInCycle}`)
  }

  const fixed = drawOrder[0]
  const rotating = drawOrder.slice(1)
  const steps = roundInCycle - 1
  const rotated = [...rotating.slice(rotating.length - steps), ...rotating.slice(0, rotating.length - steps)]
  const circle = [fixed, ...rotated]

  const pairings: [string, string][] = []
  for (let i = 0; i < n / 2; i++) {
    pairings.push([circle[i], circle[n - 1 - i]])
  }
  return pairings
}

// sequenceNumber is 1-indexed across the whole season (1..cyclesPerSeason * (N-1)).
// The cycle number itself doesn't affect the pairing — cycles repeat identically.
export function getPairingsForRound(drawOrder: string[], sequenceNumber: number): [string, string][] {
  const n = drawOrder.length
  const roundInCycle = ((sequenceNumber - 1) % (n - 1)) + 1
  return circleMethodRound(drawOrder, roundInCycle)
}
