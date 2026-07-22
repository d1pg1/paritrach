# Head-to-Head Round-Robin Season Format — Feature Spec

> Status: **ready for implementation** — concept and architecture are resolved; see
> "Implementation Plan" for the concrete build. Any remaining deferred items are called
> out explicitly in that section rather than blocking the rest.

## Overview

Replace the current "everyone bets independently, ranked on one leaderboard" season format
with a head-to-head league, **fully replacing** the solo format going forward (old seasons
keep their solo-format data and stay viewable as history via the existing season selector).

- N contestants, fixed roster locked at season start (this season: 8)
- A round-robin schedule where every contestant faces every other contestant once per
  cycle, repeated over a fixed number of cycles for the season (this season: 7 cycles ×
  7 rounds/cycle = 49 rounds (Тур) total, since N=8 → N-1=7 rounds/cycle)
- Each round splits the N contestants into N/2 head-to-head pairings (this season: 4)
- All pairings in a round share the same eligible matches for that Round (this season's
  brief uses 3 as the typical count, but the rule works for any count — see Resolved
  Decisions)
- Each pairing is scored 3 / 1 / 0 points based on who predicted more of the round's
  matches correctly — replacing today's "points = total correct bets" metric
- The existing `coefSum` metric (sum per round of the product of coefficients of winning
  bets — what the brief calls "кэф") is untouched and keeps accumulating regardless of
  head-to-head result, and remains the standings tiebreaker

## Source (raw brief, translated)

> We have 8 participants. We're changing the format — instead of everyone betting
> separately, we build a calendar of 7 cycles / 49 rounds where everyone plays against
> everyone.
>
> Round 1: Sasha–Dima, Danya–Pasha, Darina–Selin, Kirill–Igor. And so on for 7 cycles, so
> each plays each other 7 times.
>
> One round = 3 matches. Whoever guessed more correctly gets 3 points, a tie gives both
> sides 1 point, the loser gets nothing except their coefficient — even if they guessed 2
> of 3. So a 3–2 loss still nets 0 points, just their own coefficient.

## How this maps onto the current model

| Concept in brief | Current schema equivalent |
|---|---|
| Тур / round | `Round` |
| The 3 matches in a round | `Match` records with `isEligible: true` on that `Round` |
| "Guessed correctly" | `Bet.isWinner === true` |
| "Коф" / coefficient | `Bet.coefficient`, aggregated today into `coefSum` on the scoreboard (product of a round's winning coefficients, summed across rounds) |
| Season-wide ranking | `scoreboard/page.tsx`: sort by `points` desc, then `coefSum` desc |

None of the following exist yet and need to be designed:
- A concept of **pairing/matchup** between two contestants within a round
- A concept of **cycle number** / **round-in-cycle number** to drive round-robin scheduling
- A fixed, ordered **contestant roster** to seed the round-robin algorithm
- New **points** computation (3/1/0 per matchup) replacing "count of won bets"

## Proposed Scoring Rule (as stated in the brief)

For a pairing (User A vs User B) in a round, over that round's 3 eligible matches:

```
correctA = count of A's bets with isWinner = true among the round's 3 matches
correctB = count of B's bets with isWinner = true among the round's 3 matches

if correctA > correctB:  A +3 pts,  B +0 pts
if correctA < correctB:  A +0 pts,  B +3 pts
if correctA == correctB: A +1 pt,   B +1 pt   (including 0–0)
```

`coefSum` keeps being computed exactly as today, independent of this per-round win/loss.

## Round-Robin Scheduling (circle method — proposed, unconfirmed)

Standard round-robin for n=8 (even): fix contestant 1, rotate the remaining 7 around it.
Produces 7 rounds where each contestant meets each other contestant exactly once. Repeating
that 7-round cycle 7 times gives 49 rounds and 7 meetings per pair — matches the brief's
numbers. **This is a guess at the algorithm** — needs confirmation (see open questions).

## Resolved Decisions

1. **Scope**: H2H round-robin **fully replaces** the solo format for all new seasons.
   Old seasons keep their existing solo-format data and remain viewable as history
   (already supported — `Season` is archived, `scoreboard` page already has a season
   selector). No dual-format toggle needed; the new scoring logic only applies to
   rounds belonging to a season created under the new format going forward.
2. **Match sharing**: One shared `Round` with 3 eligible matches for the whole Тур — all
   8 contestants bet the same 3 matches; the 4 pairings are just a different way of
   scoring who beat whom on those shared picks. No new "matches per pairing" model needed.
3. **Cycle repetition**: The 7-round circle-method pairing pattern is generated once and
   repeated identically for all 7 cycles — no reshuffling or reversal between cycles.
4. **Missed bets**: No bet on a match = counts as incorrect (0) for that match, same as
   a wrong guess. No void/postponement logic needed.
5. **Season ranking**: Sum H2H points across all rounds; tiebreak by `coefSum`, exactly
   mirroring today's `points` → `coefSum` sort on the scoreboard. No further tiebreaker.
6. **Eligible-match count is not fixed at 3**: "3 matches" in the brief was illustrative,
   not a hard rule. The scoring rule (more correct picks wins, equal picks ties) works
   for any number of eligible matches in a round — no admin-side constraint needed on
   round setup.
7. **Roster size is not hard-locked at 8**: the circle-method scheduler should generalize
   to N contestants (8 was just this season's headcount), with a bye round if N is odd.
   Roster (headcount + the list of who) **locks at season start** — no mid-season
   swaps. A contestant who stops participating stays in the generated schedule and simply
   racks up misses (0 correct picks → losses) for their remaining pairings, per the
   missed-bets rule above. No replacement inherits their slot.
8. **Roster order for scheduling**: seeded by a **random draw performed at season start**
   (not admin-chosen, not carried over from prior standings). This draw fixes the order
   the circle method consumes to generate all cycles/rounds for the season.
9. **Cross-market comparison**: "guessed more correctly" is a raw count of
   `isWinner = true` bets among the round's eligible matches, regardless of what
   market/selection each side actually picked. No normalization needed — a correct pick
   is a correct pick even if the two sides picked different, non-comparable markets.
10. **Pairing visibility in UI**: contestants need to see their weekly opponent and the
    live head-to-head scoreline (e.g. "You vs Igor — 2-1") somewhere in the UI, most
    naturally on the round/betting page alongside their picks. This is in scope for v1,
    not just a backend scoring change — needs its own design pass (where exactly it's
    shown, whether it updates live as bets settle, etc.) before implementation.

## Lifecycle Decisions (season start / rollout)

Investigating the current codebase surfaced a structural gap: today a `Season` row is
only ever created **retroactively**, when admin clicks "archive" — until then, the
"current" season is just `Round`/`SeasonContestant` rows with `seasonId: null`, and
contestants (`/admin/contestants`) can be toggled on/off freely at any time, with no lock
point. The H2H format needs a locked roster + a fixed draw **before** any round exists,
which this implicit pattern can't support. Resolved:

11. **New "Start Season" action** replaces the retroactive-archive pattern for all
    future seasons. It creates a real `Season` row immediately (name + format=H2H), locks
    the current `seasonId: null` contestant list, runs the random draw, and points a new
    `Settings.currentSeasonId` at it. The old "archive" flow is *not* removed — see next
    point — but new seasons stop relying on `seasonId: null` accumulation.
12. **Migration**: the solo-format season currently in progress is finalized with
    today's existing "archive" button, as-is, one last time — that becomes its final
    historical (`SOLO`-format) record. Only after that does admin use the new "Start
    Season" action to begin the first H2H season. No code needs to auto-migrate
    in-progress data; this is a one-time manual admin step at rollout.
13. **Round sequencing**: rounds are still created one at a time by admin (unchanged
    UX), but each new round automatically gets the next `sequenceNumber` within its
    season (1, 2, 3, ...). Pairings for a given round are derived on the fly from
    `(drawOrder, sequenceNumber)` via the circle method — no upfront generation of all
    N×(N-1) round shells.
14. **Scoreline placement**: opponent + live H2H scoreline shown only on the round
    betting page (`rounds/[id]`) — not duplicated onto the scoreboard page.

## Implementation Plan

### 1. Schema changes (`prisma/schema.prisma`)

```prisma
enum SeasonFormat {
  SOLO
  H2H
}

model Season {
  // ...existing fields...
  format SeasonFormat @default(SOLO)   // existing archived seasons stay SOLO by default;
                                        // only the new "Start Season" endpoint writes H2H
}

model SeasonContestant {
  // ...existing fields...
  drawPosition Int?   // 0-indexed position from the season-start random draw;
                       // null for SOLO seasons / legacy rows
}

model Round {
  // ...existing fields...
  sequenceNumber Int?  // 1-indexed position within its season's H2H schedule;
                        // null for SOLO-format rounds
}

model Settings {
  // ...existing fields...
  currentSeasonId String?   // FK-less pointer (matches existing style) to the active H2H Season
}
```

Migration is additive/nullable throughout — no backfill needed. Existing `Season` rows
implicitly become `SOLO` via the column default.

### 2. Scheduling algorithm — `src/lib/h2h-schedule.ts`

Standard **circle method** round-robin, generalized to N contestants (N=8 today, assumed
even — see Deferred below):

```ts
// Fix drawOrder[0], rotate the rest through N-1 positions.
// roundInCycle is 1-indexed, 1..N-1; cycles repeat this pattern identically.
function circleMethodRound(drawOrder: string[], roundInCycle: number): [string, string][]

// sequenceNumber is 1-indexed across the whole season (1..cyclesPerSeason * (N-1)).
// roundInCycle = ((sequenceNumber - 1) % (N - 1)) + 1 — cycle number itself doesn't
// affect the pairing (cycles are identical, per the resolved decision above).
function getPairingsForRound(drawOrder: string[], sequenceNumber: number): [string, string][]
```

Pure functions, no DB access — easy to unit test against the worked example in the brief
(Round 1: Sasha–Dima, Danya–Pasha, Darina–Selin, Kirill–Igor for some draw order).

### 3. Scoring — `src/lib/h2h-scoring.ts`

```ts
computeH2HStandings(seasonId: string): Promise<Map<userId, { points: number; coefSum: number }>>
```

Logic:
1. Load the season's `drawOrder` (contestants ordered by `drawPosition`).
2. Load all rounds in the season with `sequenceNumber` set, each with eligible matches
   and bets (`isWinner`, `coefficient`).
3. For each round: compute pairings via `getPairingsForRound`; for each pairing, count
   each side's `isWinner = true` bets among that round's eligible matches (a missing bet
   counts as 0, per the resolved missed-bets rule); award 3/1/0 points per the scoring
   rule.
4. Sum points per user across all rounds.
5. `coefSum` is computed exactly as today (`scoreboard/page.tsx` lines ~55-75) —
   independent of head-to-head result, reused unchanged.

### 4. Scoreboard page changes — `src/app/(app)/scoreboard/page.tsx`

- Fetch the viewed `Season.format` alongside existing data.
- If `format === "H2H"`: replace the current "points = count of won bets" computation
  with `computeH2HStandings`. Keep the `coefSum` computation and the
  `points desc, then coefSum desc` sort exactly as-is.
- If `format === "SOLO"` (all pre-existing archived seasons): keep today's logic
  unchanged.
- "Current season" resolution changes: today the page treats "no `seasonId` in the URL"
  as `seasonId: null`. Once `Settings.currentSeasonId` exists, the default view must
  resolve to that season's real id instead — `seasonId: null` stops being a meaningful
  "current" sentinel going forward (it only still applies to reading old, already-migrated
  history if any legacy null rows remain post-migration, which they shouldn't after step
  12 above).

### 5. "Start Season" flow

New endpoint, e.g. `POST /api/admin/seasons/start` (parallel to, not replacing, the
existing `POST /api/admin/seasons` archive endpoint):

1. Require `role === ADMIN`.
2. Read current `SeasonContestant` rows where `seasonId: null`; error if empty.
3. Shuffle their `userId`s (random draw) — this is the one place a stray `Math.random()`
   is fine, since it's a real user-facing action, not a workflow script.
4. `db.$transaction`:
   - Create `Season { name, format: "H2H" }`.
   - For each contestant, create a new `SeasonContestant { seasonId: newSeason.id, userId, drawPosition: <shuffle index> }` and delete the old `seasonId: null` row (mirrors the existing archive endpoint's move pattern).
   - Upsert `Settings.currentSeasonId = newSeason.id`.
5. Return the created season.

New admin UI component, e.g. `StartSeasonForm.tsx`, alongside the existing
`CreateSeasonForm.tsx` (archive) on the admin page — name input + confirm, same shape as
today's archive form.

### 6. Round creation changes — `src/app/api/admin/rounds/route.ts`, `CreateRoundForm.tsx`

On round creation:
1. Read `Settings.currentSeasonId`.
2. If unset → reject with a clear error ("Start a season before creating rounds") rather
   than silently falling back to legacy `seasonId: null` behavior — avoids silently
   creating orphaned/unscored rounds under the new format.
3. If set → look up the season's `format`. For `H2H`: set the new round's `seasonId` to
   `currentSeasonId`, and `sequenceNumber` = `(max existing sequenceNumber in that season ?? 0) + 1`.

No other changes to round/match setup (adding matches, marking eligible, opening
betting) — those flows are untouched; `sequenceNumber` is set once, at creation.

### 7. Round betting page — opponent + live scoreline

`src/app/(app)/rounds/[id]/page.tsx` / `BettingCard.tsx`:

- If the round's season is `H2H` and it has a `sequenceNumber`: compute the viewer's
  opponent via `getPairingsForRound(drawOrder, sequenceNumber)`, and the live score via
  the same correct-pick-count logic as `computeH2HStandings`, scoped to this one round.
- Render "You vs {opponent nickname} — {yourCorrect}-{theirCorrect}" near the picks.
- "Live" here means it reflects whatever bets are already settled (`isWinner` set) at
  render time — reuse the existing `LiveScorePoller`/live-scores refresh mechanism so the
  scoreline updates the same way match scores already do, rather than building a second
  polling path.

### 8. Task checklist

1. Prisma schema migration (§1) + `prisma migrate dev`
2. `src/lib/h2h-schedule.ts` — circle method + unit tests against the brief's example
3. `src/lib/h2h-scoring.ts` — standings computation
4. Scoreboard page: format-aware points computation + current-season resolution via
   `Settings.currentSeasonId`
5. `POST /api/admin/seasons/start` + `StartSeasonForm.tsx`
6. Round creation: `sequenceNumber` assignment + guard against missing
   `currentSeasonId`
7. Round betting page: opponent + live scoreline UI
8. Manual rollout step (§12): archive the in-progress solo season, then start the first
   H2H season

### Deferred (not needed for this season, flagged for later)

- **Odd N / bye rounds**: circle method as speced assumes even N (today's 8). Odd N
  needs a "bye" placeholder team whose paired contestant sits out (no H2H points that
  round). Not implemented now since the current roster is 8; add if/when roster size
  goes odd.
- Removing/cleaning up the now-largely-vestigial old archive flow once no SOLO seasons
  are left in flight — not urgent, it still works and does no harm coexisting.

## Out of Scope (for now)

- UI/bracket or schedule visualization
- Notifications for upcoming head-to-head matchups (would extend `telegram-notifications.md`)
- Playoffs / knockout stage after the 49 rounds
