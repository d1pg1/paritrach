"use client"

import { useTranslations } from "next-intl"

export interface H2HScorelineData {
  opponentName: string
  yourCorrect: number
  theirCorrect: number
}

export function H2HScoreline({ data }: { data: H2HScorelineData | null }) {
  const t = useTranslations("round")
  if (!data) return null

  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm">
      <span className="text-neutral-300">
        {t("h2hVsOpponent", { opponent: data.opponentName })}
      </span>
      <span className="font-mono font-bold text-yellow-400">
        {data.yourCorrect}–{data.theirCorrect}
      </span>
    </div>
  )
}
