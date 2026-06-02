# PariTrach — Season 2025/26 Report

**Source:** Telegram chat text messages (betting result summaries)
**Data file:** `season_results.json`

---

## Coverage

| | |
|---|---|
| Total rounds | 49 (Тур 1 – Тур 49) |
| Rounds with result data | **49 / 49** |
| Missing rounds | **none** |

### Incomplete data (after fill)

| Round | Issue |
|---|---|
| **Тур 38–49** | **Дарина dropped out** — no bets recorded for last 12 rounds |
| Тур 38 | Саша also missing (1 round only) |
| Тур 27 Саша | Bet type lost in parsing — result filled as ❌ |

All 15 previously missing ✅/❌ results have been filled using verified match scores.

---

## Season standings

Ranked by **points** (= number of winning bets). Tiebreak: win %.

| Place | Bettor | Points | Losses | Total bets | Win % | Rounds |
|---|---|---|---|---|---|---|
| 🥇 1 | **Дима** | **99** | 56 | 155 | 63.9% | 49 |
| 🥈 2 | **Дарина** | **69** | 46 | 115 | 60.0% | 37 |
| 🥉 3 | **Саша** | **83** | 65 | 148 | 56.1% | 48 |
| 4 | **Даня** | **85** | 67 | 152 | 55.9% | 49 |

> Дарина left after round 37. Her 60% win rate over 37 rounds would likely keep her 2nd if she'd finished all 49.

---

## Bet notation reference

Abbreviations used in result summaries:

| Notation | Meaning |
|---|---|
| `П1` / `П2` | Home / Away win |
| `Х` | Draw |
| `1Х` / `Х2` / `12` | Double chance |
| `ТБ N` / `ТМ N` | Total over / under N goals |
| `ОЗ` | Both teams to score |
| `Ф1/Ф2 ±N` | Handicap |
| `П1 + ТБ 1,5` | Combo: result + total |
| `1Х + 2-6` | Combo: double chance + goal interval |
| `Гол Кейна` | Named goalscorer |
| `КП ТБ 0,5` | Team total (e.g. Crystal Palace over 0.5) |
| `1 тайм: ТБ 0,5` | 1st half total |

---

## Notes

- 54 raw result messages found; rounds with both a draft and a final "Итог" version always use the final
- **Санчес** and **СВАГА** appear in a few photo slips only — not in text summaries
- Individual bet coefficients are available separately in `bets.json` (OCR-parsed from photo slips)
