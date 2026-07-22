"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

export function StartSeasonForm() {
  const t = useTranslations("admin")
  const [name, setName] = useState("")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleStart() {
    if (!name.trim()) return
    setLoading(true)
    setError("")
    const res = await fetch("/api/admin/seasons/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
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
        <div className="flex items-center gap-2 flex-wrap">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("startSeasonNamePlaceholder")}
            className="bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
          />
          <button
            onClick={handleStart}
            disabled={loading || !name.trim()}
            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-lg px-3 py-1.5 text-sm transition-colors"
          >
            {loading ? "…" : t("start")}
          </button>
          <button onClick={() => setOpen(false)} className="text-neutral-400 text-sm">
            {t("cancel")}
          </button>
          {error && <p className="text-red-400 text-sm w-full">{error}</p>}
        </div>
      )}
    </div>
  )
}
