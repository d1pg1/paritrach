"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function CreateRoundForm() {
  const [name, setName] = useState("")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    await fetch("/api/admin/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    setLoading(false)
    setName("")
    setOpen(false)
    router.refresh()
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg px-4 py-2 text-sm transition-colors"
        >
          + New Round
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Round name…"
            className="bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-lg px-3 py-1.5 text-sm transition-colors"
          >
            {loading ? "…" : "Create"}
          </button>
          <button onClick={() => setOpen(false)} className="text-neutral-400 text-sm">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
