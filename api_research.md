# API Research Report — PariTrach

## Goal
Find free/cheap data sources for: match schedule, betting odds/coefficients, and match results for FIFA World Cup 2026.

---

## Data Sources

### 1. Match Schedule — The Odds API `/events` (free)
- **72 fixtures** available now (group stage), **no credits used**
- Returns: `home_team`, `away_team`, `commence_time`, `id`
- World Cup starts June 11, 2026

### 2. Odds & Coefficients — OddsPapi (primary choice)
- **Free plan**: 250 requests total, 11 used so far
- **Key endpoint**: `/v4/odds-by-tournaments?tournamentIds=16&bookmaker=pinnacle`
  - 1 request = **all 72 matches** + **62 markets each**, from Pinnacle
- **Key endpoint**: `/v4/odds?fixtureId=...`
  - 1 request = 1 match, all bookmakers (86), all 105 markets
- Covers almost everything from the group's betting history:

| Category | Coverage |
|---|---|
| match_result, double_chance, btts, totals | ✅ 60–86 bookmakers |
| team totals, first half result, asian handicap | ✅ 19–72 bookmakers |
| correct score, european handicap, draw no bet | ✅ 22–73 bookmakers |
| first goalscorer (player) | ⚠️ appears closer to match day |
| combo markets (double_chance + total, etc.) | ❌ not offered by any API |

### 3. Match Results — ESPN public API (free, no auth)
- `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard`
- Add `?dates=YYYYMMDD` to query any specific date
- Returns: team names, scores, `winner` flag, match `status` (Scheduled / In Progress / Final)
- No API key, no rate limits documented, no credits consumed

---

## Recommended Flow

```
Matchday setup  → /events (free)               → show fixtures, users vote eligible matches
Betting opens   → /odds-by-tournaments (1 req) → fetch & lock coefficients in DB
Match ends      → ESPN scoreboard (free)         → determine winners, award points
```

**Estimated total credit usage for full World Cup: ~10 requests out of 250.**
