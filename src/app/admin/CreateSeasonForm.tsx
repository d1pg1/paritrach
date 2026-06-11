"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

interface Props {
  initialName: string | null
}

export function CreateSeasonForm({ initialName }: Props) {
  const t = useTranslations("admin")
  const [name, setName] = useState(initialName ?? "")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleArchive() {
    if (!name.trim()) return
    setLoading(true)
    setError("")
    const res = await fetch("/api/admin/seasons", {
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
          {t("archiveToSeason")}
        </button>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("seasonNamePlaceholder")}
            className="bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            onKeyDown={(e) => e.key === "Enter" && handleArchive()}
          />
          <button
            onClick={handleArchive}
            disabled={loading || !name.trim()}
            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-lg px-3 py-1.5 text-sm transition-colors"
          >
            {loading ? "…" : t("archive")}
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
