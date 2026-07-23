"use client"

import { useTranslations } from "next-intl"

export interface H2HPairingData {
  contestantAId: string
  contestantAName: string
  contestantBId: string
  contestantBName: string
  correctA: number
  correctB: number
}

export function H2HScoreline({ pairings, viewerId }: { pairings: H2HPairingData[]; viewerId: string }) {
  const t = useTranslations("round")
  if (pairings.length === 0) return null

  return (
    <div className="space-y-1.5">
      {pairings.map((p) => {
        const isViewer = p.contestantAId === viewerId || p.contestantBId === viewerId
        const viewerIsA = p.contestantAId === viewerId
        const [yourCorrect, theirCorrect] = viewerIsA ? [p.correctA, p.correctB] : [p.correctB, p.correctA]
        return (
          <div
            key={`${p.contestantAId}-${p.contestantBId}`}
            className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
              isViewer ? "border-neutral-700 bg-neutral-900" : "border-neutral-800 bg-neutral-900/50"
            }`}
          >
            <span className="text-neutral-300">
              {isViewer
                ? t("h2hVsOpponent", { opponent: viewerIsA ? p.contestantBName : p.contestantAName })
                : t("h2hPairing", { a: p.contestantAName, b: p.contestantBName })}
            </span>
            <span className={`font-mono font-bold ${isViewer ? "text-yellow-400" : "text-neutral-400"}`}>
              {isViewer ? `${yourCorrect}–${theirCorrect}` : `${p.correctA}–${p.correctB}`}
            </span>
          </div>
        )
      })}
    </div>
  )
}
