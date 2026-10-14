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
          className="bg-surface-3 hover:bg-surface-4 text-fg font-bold rounded-lg px-4 py-2 text-sm transition-colors"
        >
          {t("startSeason")}
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10">
          <div className="w-full max-w-md rounded-xl border border-line bg-panel p-5">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("startSeasonNamePlaceholder")}
              className="w-full bg-surface border border-line-2 text-fg placeholder-subtle rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />

            <p className="mt-4 mb-2 text-sm text-muted">{t("startSeasonPickContestants")}</p>
            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {users.map((u) => {
                const isSelected = selected.has(u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                      isSelected
                        ? "bg-accent-tint/30 border-yellow-600 hover:border-yellow-400"
                        : "bg-surface border-line hover:border-line-3"
                    }`}
                  >
                    <span className="font-medium text-fg">
                      {u.nickname ?? u.username}
                      {u.nickname && <span className="ml-2 text-subtle">@{u.username}</span>}
                    </span>
                    <span className={isSelected ? "text-accent font-semibold" : "text-subtle"}>
                      {isSelected ? t("contestantActive") : t("contestantInactive")}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="mt-3 text-xs text-subtle">
              {t("startSeasonContestantCount", { count: selected.size })}
            </p>
            {selected.size < 2 && (
              <p className="mt-1 text-xs text-danger">{t("startSeasonNeedMore")}</p>
            )}
            {selected.size >= 2 && selected.size % 2 !== 0 && (
              <p className="mt-1 text-xs text-danger">{t("startSeasonNeedEven")}</p>
            )}
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleStart}
                disabled={loading || !canStart}
                className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-lg px-3 py-1.5 text-sm transition-colors"
              >
                {loading ? "…" : t("start")}
              </button>
              <button onClick={() => setOpen(false)} className="text-muted text-sm">
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
