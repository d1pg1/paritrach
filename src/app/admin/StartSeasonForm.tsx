"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

interface UserRow {
  id: string
  username: string
  nickname: string | null
  isContestant: boolean
}

export function StartSeasonForm({ users }: { users: UserRow[] }) {
  const t = useTranslations("admin")
  const [name, setName] = useState("")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(users.filter((u) => u.isContestant).map((u) => u.id))
  )

  const router = useRouter()

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const canStart = name.trim() && selected.size >= 2 && selected.size % 2 === 0

  async function handleStart() {
    if (!canStart) return
    setLoading(true)
    setError("")
    const res = await fetch("/api/admin/seasons/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userIds: [...selected] }),
    })
    setLoading(false)
    if (!res.ok) {
      setError(await res.text())
      return
    }
    setName("")
    setOpen(false)
    router.refresh()
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-neutral-700 hover:bg-neutral-600 text-white font-bold rounded-lg px-4 py-2 text-sm transition-colors"
        >
          {t("startSeason")}
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10">
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-5">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("startSeasonNamePlaceholder")}
              className="w-full bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />

            <p className="mt-4 mb-2 text-sm text-neutral-400">{t("startSeasonPickContestants")}</p>
            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {users.map((u) => {
                const isSelected = selected.has(u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                      isSelected
                        ? "bg-yellow-950/30 border-yellow-600 hover:border-yellow-400"
                        : "bg-neutral-900 border-neutral-800 hover:border-neutral-600"
                    }`}
                  >
                    <span className="font-medium text-white">
                      {u.nickname ?? u.username}
                      {u.nickname && <span className="ml-2 text-neutral-500">@{u.username}</span>}
                    </span>
                    <span className={isSelected ? "text-yellow-400 font-semibold" : "text-neutral-500"}>
                      {isSelected ? t("contestantActive") : t("contestantInactive")}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="mt-3 text-xs text-neutral-500">
              {t("startSeasonContestantCount", { count: selected.size })}
            </p>
            {selected.size < 2 && (
              <p className="mt-1 text-xs text-red-400">{t("startSeasonNeedMore")}</p>
            )}
            {selected.size >= 2 && selected.size % 2 !== 0 && (
              <p className="mt-1 text-xs text-red-400">{t("startSeasonNeedEven")}</p>
            )}
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleStart}
                disabled={loading || !canStart}
                className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-lg px-3 py-1.5 text-sm transition-colors"
              >
                {loading ? "…" : t("start")}
              </button>
              <button onClick={() => setOpen(false)} className="text-neutral-400 text-sm">
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
