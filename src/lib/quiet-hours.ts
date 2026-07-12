// Quiet hours are 23:00–09:00 (exclusive upper bound) in the given IANA timezone.
// Reminders that would fire during quiet hours are shifted backwards to 22:00,
// since shifting forward would send them after bets are already closed.

function zonedParts(date: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  return map
}

function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone)
  const asUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour), Number(p.minute), Number(p.second)
  )
  return (asUtc - date.getTime()) / 60000
}

function zonedTimeToUtc(
  year: number, month: number, day: number, hour: number, minute: number, timeZone: string
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const offset = timeZoneOffsetMinutes(guess, timeZone)
  let utc = new Date(guess.getTime() - offset * 60000)
  const offset2 = timeZoneOffsetMinutes(utc, timeZone)
  if (offset2 !== offset) utc = new Date(guess.getTime() - offset2 * 60000)
  return utc
}

export function applyQuietHoursAdjustment(fireAt: Date, timeZone: string): Date {
  const p = zonedParts(fireAt, timeZone)
  const hour = Number(p.hour)
  const inQuietHours = hour >= 23 || hour < 9
  if (!inQuietHours) return fireAt

  const year = Number(p.year)
  const month = Number(p.month)
  const day = Number(p.day)

  if (hour >= 23) {
    return zonedTimeToUtc(year, month, day, 22, 0, timeZone)
  }

  const prevDay = new Date(Date.UTC(year, month - 1, day))
  prevDay.setUTCDate(prevDay.getUTCDate() - 1)
  return zonedTimeToUtc(
    prevDay.getUTCFullYear(), prevDay.getUTCMonth() + 1, prevDay.getUTCDate(), 22, 0, timeZone
  )
}
