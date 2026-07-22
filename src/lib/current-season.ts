import { db } from "@/lib/db"

export interface SeasonSelectorData {
  /** Resolved season id to query against — a real id whenever a "current" H2H season exists. */
  seasonId: string | null
  /** Null iff the viewer is looking at the current season — mirrors <SeasonSelector>'s null-means-current prop. */
  selectorSeasonId: string | null
  seasons: { id: string; name: string }[]
  currentSeasonName: string | null
}

// Resolves which season a page should show: an explicit ?seasonId= param, or the
// active season pointed to by Settings.currentSeasonId, falling back to the legacy
// seasonId:null bucket for installs that haven't run "Start Season" yet. The active
// season is excluded from `seasons` (the history list) since it's represented by the
// "current" selector entry instead.
export async function resolveCurrentSeason(rawSeasonId: string | undefined): Promise<SeasonSelectorData> {
  const settings = await db.settings.findUnique({ where: { id: "singleton" } })
  const currentSeasonId = settings?.currentSeasonId ?? null

  const isCurrent = !rawSeasonId || rawSeasonId === "current" || rawSeasonId === currentSeasonId
  const seasonId = isCurrent ? currentSeasonId : rawSeasonId!

  const [seasons, currentSeason] = await Promise.all([
    db.season.findMany({
      where: currentSeasonId ? { id: { not: currentSeasonId } } : undefined,
      orderBy: { archivedAt: "desc" },
      select: { id: true, name: true },
    }),
    currentSeasonId ? db.season.findUnique({ where: { id: currentSeasonId }, select: { name: true } }) : null,
  ])

  return {
    seasonId,
    selectorSeasonId: isCurrent ? null : seasonId,
    seasons,
    currentSeasonName: currentSeason?.name ?? settings?.currentSeasonName ?? null,
  }
}
