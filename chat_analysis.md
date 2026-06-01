# PariTrach Chat Analysis

Source: Telegram group chat dump, 9 HTML files.

## Overview

| | |
|---|---|
| Rounds tracked | 49 (Тур 1 – Тур 49) |
| Round leaderboard photos | 40 |
| Odds bet photos found | 218 |
| Successfully OCR-parsed | 209 (95%) |
| Multi-part bets (1/3, 2/3…) | 19 |

## Bettors

| Name | Bet photos |
|---|---|
| Дима | 60 |
| Даня | 58 |
| Саша | 49 |
| Дарина | 46 |
| Санчес | 3 |
| СВАГА | 1 |
| Дань | 1 |

## Bet Slip Types

| Type | Count |
|---|---|
| Експрес (accumulator) | 184 |
| Ординар (single) | 25 |

## Bet Categories

Extracted from 209 parsed slips. `other` = OCR noise or unrecognised layout.

| Category | Selections | Notes |
|---|---|---|
| `double_chance` | 79 | X2, 1X, 12 |
| `btts` | 75 | Обидві команди заб'ють — Так/Ні |
| `match_result` | 71 | Win for a specific team |
| `double_chance_and_total` | 60 | X2 і 2-6 style combos |
| `total_over` | 41 | Більше (N) — full match total |
| `first_goalscorer` | 40 | Заб'є перший гол |
| `team_total_over` | 34 | Team 1/2: Більше (N) |
| `total_under` | 29 | Менше (N) — full match total |
| `result_and_total` | 24 | Team і Більше N combos |
| `handicap` | 17 | Фора голів |
| `first_half_result` | 13 | 1-й тайм: Результат |
| `team_total_under` | 11 | Team 1/2: Менше (N) |
| `goalscorer` | 6 | Автори голів |
| `qualification` | 5 | Прохід (cup / knockout stage) |
| `goal_both_halves` | 3 | Гол у обох таймах |
| `tournament_winner` | 3 | Здобуде кубок |
| `time_segment_total` | 2 | 1-15 хв. Тотал |
| `asian_handicap` | 2 | Мікс шансів |
| `exact_score` | 1 | Точний рахунок |
| `draw_or_total` | 1 | Нічия або тотал голів |
| `other` | 85 | OCR noise / unknown |

## App Layouts Detected

Two different betting apps used by the group:

**App 1 — Dark theme (Parimatch-style)**
- Header: `Купон`, slip type `Експрес / Ординар`
- Date format: `DD.MM, HH:MM Team A - Team B`
- Total coeff: `Експрес N.NNN`
- Used by all bettors, dominant in early rounds

**App 2 — Light theme**
- Header: `Експрес` + `Очистити все`
- Date format: `DD.MM.YYYY, HH:MM`
- Total coeff: `Коефіцієнти N.NNN`
- Appears from ~round 16 onward

## Data Output

All parsed data saved to `bets.json`. Each record:

```json
{
  "type": "odds_bet",
  "message_id": "message138598",
  "bettor": "Даня",
  "round": 1,
  "part": null,
  "photo": "photos/photo_15@15-08-2025_22-55-16.jpg",
  "date": "15.08.2025 22:55:16 UTC+02:00",
  "slip": {
    "slip_type": "express",
    "total_coefficient": 5.105,
    "selections": [
      {
        "label": "X2",
        "category": "double_chance",
        "sub_label": "Подвійний шанс",
        "coefficient": 1.63,
        "match": "Астон Вілла - Ньюкасл Юнайтед",
        "match_date": "16.08, 14:30"
      }
    ]
  }
}
```
