"use client"

import { UserAvatar } from "@/components/UserAvatar"

export interface H2HPairingData {
  contestantAId: string
  contestantAName: string
  contestantALogoUrl: string | null
  contestantBId: string
  contestantBName: string
  contestantBLogoUrl: string | null
  correctA: number
  correctB: number
}

export function H2HScoreline({ pairings, viewerId }: { pairings: H2HPairingData[]; viewerId: string }) {
  if (pairings.length === 0) return null

  return (
    <div className="space-y-1.5">
      {pairings.map((p) => {
        const isViewer = p.contestantAId === viewerId || p.contestantBId === viewerId
        return (
          <div
            key={`${p.contestantAId}-${p.contestantBId}`}
            className={`grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
              isViewer ? "border-neutral-700 bg-neutral-900" : "border-neutral-800 bg-neutral-900/50"
            }`}
          >
            <div className="flex items-center justify-end gap-1.5 min-w-0">
              <span className={p.contestantAId === viewerId ? "text-yellow-400 font-semibold" : "text-neutral-300"}>
                {p.contestantAName}
              </span>
              <UserAvatar logoUrl={p.contestantALogoUrl} displayName={p.contestantAName} size={24} />
            </div>
            <span className="text-neutral-500 px-1">vs</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <UserAvatar logoUrl={p.contestantBLogoUrl} displayName={p.contestantBName} size={24} />
              <span className={p.contestantBId === viewerId ? "text-yellow-400 font-semibold" : "text-neutral-300"}>
                {p.contestantBName}
              </span>
            </div>
            <span className={`font-mono font-bold flex-shrink-0 ${isViewer ? "text-yellow-400" : "text-neutral-400"}`}>
              {p.correctA}–{p.correctB}
            </span>
          </div>
        )
      })}
    </div>
  )
}
