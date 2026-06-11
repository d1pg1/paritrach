"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"

interface Season {
  id: string
  name: string
}

interface Props {
  seasons: Season[]
  currentSeasonId: string | null
  currentSeasonName?: string | null
}

export function SeasonSelector({ seasons, currentSeasonId, currentSeasonName }: Props) {
  const t = useTranslations("seasons")
  const router = useRouter()
  const searchParams = useSearchParams()

  function select(seasonId: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (seasonId === null) {
      params.delete("seasonId")
    } else {
      params.set("seasonId", seasonId)
    }
    const qs = params.toString()
    router.push(qs ? `?${qs}` : "?")
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => select(null)}
        className={`text-sm px-3 py-1 rounded-full border transition-colors ${
          currentSeasonId === null
            ? "bg-yellow-400 border-yellow-400 text-black font-semibold"
            : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
        }`}
      >
        {currentSeasonName || t("current")}
      </button>
      {seasons.map((s) => (
        <button
          key={s.id}
          onClick={() => select(s.id)}
          className={`text-sm px-3 py-1 rounded-full border transition-colors ${
            currentSeasonId === s.id
              ? "bg-yellow-400 border-yellow-400 text-black font-semibold"
              : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
          }`}
        >
          {s.name}
        </button>
      ))}
    </div>
  )
}
