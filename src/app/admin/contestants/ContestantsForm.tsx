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

export function ContestantsForm({ users }: { users: UserRow[] }) {
  const t = useTranslations("admin")
  const router = useRouter()
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggle(userId: string) {
    setToggling(userId)
    await fetch("/api/admin/contestants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    setToggling(null)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <button
          key={u.id}
          onClick={() => toggle(u.id)}
          disabled={toggling === u.id}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
            u.isContestant
              ? "bg-yellow-950/30 border-yellow-600 hover:border-yellow-400"
              : "bg-neutral-900 border-neutral-800 hover:border-neutral-600"
          } ${toggling === u.id ? "opacity-50" : ""}`}
        >
          <span className="font-medium text-white">
            {u.nickname ?? u.username}
            {u.nickname && (
              <span className="ml-2 text-sm text-neutral-500">@{u.username}</span>
            )}
          </span>
          <span
            className={`text-sm font-semibold ${
              u.isContestant ? "text-yellow-400" : "text-neutral-500"
            }`}
          >
            {u.isContestant ? t("contestantActive") : t("contestantInactive")}
          </span>
        </button>
      ))}
    </div>
  )
}
