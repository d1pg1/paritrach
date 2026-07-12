# Telegram Notifications — Feature Spec

## Overview

Add a Telegram bot that posts to a shared group chat on two triggers:
1. A round opens for betting
2. A reminder ~3 hours before the first eligible match in a round, tagging only users who have at least one missing bet (did not bet on every eligible match in the round)

## Constraints

- Hosted on Vercel Hobby — no minute-level cron jobs
- Scheduler: **Upstash QStash** (free tier, ~500 msg/month) for precise delayed reminders
- Bot is send-only — no commands, no DMs, posts to one hardcoded group chat
- Tagging works via `@telegramUsername` in the message text
- Reminders must not fire during quiet hours (23:00–09:00 in the group's configured timezone)

---

## Data Model Changes

### `User` model — add optional field

```prisma
telegramUsername  String?   // e.g. "john_doe" (without @)
```

Migration: additive, nullable, no backfill needed.

---

## Environment Variables

```
TELEGRAM_BOT_TOKEN=          # from BotFather
TELEGRAM_GROUP_CHAT_ID=      # negative number, e.g. -1001234567890
TELEGRAM_TIMEZONE=           # IANA timezone of the group, e.g. "Europe/Kyiv"
QSTASH_TOKEN=                # from Upstash console
QSTASH_CURRENT_SIGNING_KEY=  # for verifying incoming QStash requests
QSTASH_NEXT_SIGNING_KEY=     # for key rotation
NEXT_PUBLIC_APP_URL=         # this deployment's public URL — QStash needs it to call back
                              # into /api/telegram/reminder; falls back to VERCEL_URL if unset
```

---

## Architecture

```
Admin: open-betting
  └─ round status → BETTING
  └─ after(): notifyRoundOpened(roundId)   (runs post-response, same process — no HTTP hop)
       └─ send group message (round opened)
       └─ POST QStash: delay=(firstMatchTime - 3h), url=/api/telegram/reminder, body={roundId}

QStash (at scheduled time)
  └─ POST /api/telegram/reminder  { roundId }
      └─ verify QStash signature
      └─ find all current season contestants with telegramUsername set
      └─ find eligible matches in round
      └─ for each user: check if they have a bet on EVERY eligible match
      └─ collect users with ≥1 missing bet
      └─ if none → do nothing
      └─ send group message tagging them
```

---

## Implementation Tasks

### 1. Schema migration

Add `telegramUsername String?` to `User` in `prisma/schema.prisma`.  
Run `prisma migrate dev`.

---

### 2. Telegram bot utility — `src/lib/telegram.ts`

Single exported function:

```ts
sendGroupMessage(text: string): Promise<void>
```

Uses `TELEGRAM_BOT_TOKEN` + `TELEGRAM_GROUP_CHAT_ID`.  
Plain `fetch` to `https://api.telegram.org/bot{token}/sendMessage` with `parse_mode: "HTML"`.  
No library needed.

---

### 3. QStash utility — `src/lib/qstash.ts`

Two exports:

```ts
scheduleReminder(roundId: string, fireAt: Date): Promise<void>
verifyQStashRequest(req: Request): Promise<boolean>
```

`scheduleReminder` POSTs to QStash with `Not-Before` header (unix timestamp).  
`verifyQStashRequest` uses the **`@upstash/qstash` package** (`Receiver` class) with `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` — handles HMAC-SHA256 JWT verification and key rotation automatically.

---

### 4. Missing-bet query — `src/lib/telegram-notifications.ts`

```ts
getUsersWithMissingBets(roundId: string): Promise<{ username: string; telegramUsername: string }[]>
```

Logic:
- Fetch all eligible matches in the round
- Fetch all current season contestants (`seasonId IS NULL`) with `telegramUsername != null`
- For each such user, count their bets in this round against eligible match count
- Return users where `betCount < eligibleMatchCount`

---

### 5. `notifyRoundOpened(roundId)` — `src/lib/telegram-notifications.ts`

Called directly (not over HTTP) from `open-betting`'s route via Next's `after()`, so it
runs once the response has been sent without needing a public URL or a shared secret
to reach itself.

Steps:
1. Get round with name and first eligible match `startTime`
2. Send group message: `"🟡 Round <b>{escaped name}</b> is open for betting!"` — failure here
   is logged and does not prevent step 4 from running
3. Compute `fireAt`:
   - Start with `firstMatch.startTime - 3 hours`
   - Apply quiet-hours adjustment (see below)
   - If `fireAt` is still in the past after adjustment → skip reminder entirely
4. Schedule QStash reminder at adjusted `fireAt`

All free-text values (round name, usernames) are HTML-escaped before being interpolated
into a `parse_mode: "HTML"` Telegram message — an unescaped `&`/`<`/`>` would otherwise
cause Telegram to reject the whole message.

#### Quiet-hours adjustment

Quiet hours: **23:00–09:00** in `TELEGRAM_TIMEZONE` (exclusive upper bound — 09:00 exactly is safe).

```
if fireAt is within quiet hours:
  → shift back to 22:00 of the same calendar day (if 23:xx) 
    or 22:00 of the previous calendar day (if 00:xx–08:59)
```

Always shift **backwards** — shifting forward would send the reminder after bets are already closed.

Example: match at 01:00, `firstMatch - 3h` = 22:00 → already fine, no shift.  
Example: match at 00:30, `firstMatch - 3h` = 21:30 → fine.  
Example: match at 03:00, `firstMatch - 3h` = 00:00 → falls in quiet zone → shift to 22:00 the previous evening.

Auth: none needed — this is a direct in-process function call, not an HTTP endpoint.

---

### 6. `/api/telegram/reminder` — POST route

Called by QStash at scheduled time. Body: `{ roundId: string }`.

Steps:
1. Verify QStash signature — return 200 immediately if invalid (don't retry)
2. Check round status is still `BETTING` — if closed/results, skip silently
3. Call `getUsersWithMissingBets(roundId)`
4. If empty list → return 200, no message sent
5. Build message:
   ```
   ⏰ Reminder: <b>{roundName}</b> starts soon!
   
   Missing bets: @user1 @user2 @user3
   ```
6. Send group message

---

### 7. Wire into `open-betting` route

In `src/app/api/admin/rounds/[id]/open-betting/route.ts`, after the round status update:

```ts
// Runs after the response is sent, but Next keeps the invocation alive until it
// settles — unlike a bare un-awaited call, it can't be cut off by the runtime.
after(() => notifyRoundOpened(id))
```

---

### 8. Admin users panel — Telegram username field

> **Resolved:** no self-service profile page. Admin manages Telegram usernames for all users.

In `src/app/admin/users/UsersManager.tsx`, add a `telegramUsername` column with inline editing (same pattern as the existing nickname column).

Changes required:
- Add `telegramUsername: string | null` to the `UserRow` interface and the admin page query
- Add an inline editable cell (click to edit, Enter to save, Escape to cancel) — strip leading `@` on save
- Extend `PATCH /api/admin/users/[id]` to also accept and persist `telegramUsername`

No validation beyond basic string (Telegram usernames are 5–32 chars, alphanumeric + underscore).

---

## "Missing bets" definition

A user is considered to have missing bets in a round if:

```
number of their Bet records for this round < number of eligible matches in the round
```

This covers both zero bets and partial bets. The `Bet` schema enforces `@@unique([userId, matchId])` so there is at most one bet per user per match.

Only **current season contestants** (`SeasonContestant` with `seasonId IS NULL`) are checked. Users not in the current season are ignored even if they have a `telegramUsername`.

---

## Edge Cases

| Case | Handling |
|---|---|
| All users have bet | `getUsersWithMissingBets` returns empty → no message sent |
| User has no `telegramUsername` | Excluded from query — never tagged |
| First match < 3h away when betting opens | `fireAt` is in the past after adjustment → skip QStash scheduling, no reminder |
| `fireAt` lands in 23:00–23:59 quiet zone | Shifted back to 22:00 same day |
| `fireAt` lands in 00:00–08:59 quiet zone | Shifted back to 22:00 previous evening |
| Adjusted `fireAt` is still in the past | Skip reminder entirely |
| Round closed before reminder fires | Route checks status on arrival, skips if not BETTING |
| QStash delivers reminder twice (retry) | Idempotent — same query, same result, same message sent (acceptable) |
| No eligible matches in round | `open-betting` route already blocks this case |

---

## Out of Scope

- Per-user notification opt-out
- Bot commands (`/mybets`, `/standings`, etc.)
- DM notifications
- iOS / Android push notifications
