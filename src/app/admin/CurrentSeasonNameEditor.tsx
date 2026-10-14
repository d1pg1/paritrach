"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

interface Props {
  initialName: string | null
}

export function CurrentSeasonNameEditor({ initialName }: Props) {
  const t = useTranslations("admin")
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName ?? "")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSave() {
    setLoading(true)
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentSeasonName: name }),
    })
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  function handleCancel() {
    setName(initialName ?? "")
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 mb-4 text-sm text-muted">
      <span>{t("currentSeasonName")}:</span>
      {editing ? (
        <>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("seasonNamePlaceholder")}
            className="bg-surface border border-line-2 text-fg placeholder-subtle rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave()
              if (e.key === "Escape") handleCancel()
            }}
          />
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-lg px-3 py-1 text-sm transition-colors"
          >
            {loading ? "…" : t("save")}
          </button>
          <button onClick={handleCancel} className="text-muted text-sm">
            {t("cancel")}
          </button>
        </>
      ) : (
        <>
          <span className={initialName ? "text-fg font-medium" : "text-subtle italic"}>
            {initialName || t("notSet")}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-subtle hover:text-accent transition-colors text-xs underline"
          >
            {t("edit")}
          </button>
        </>
      )}
    </div>
  )
}
