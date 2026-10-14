"use client"

import { useState } from "react"

interface InlineEditCellProps {
  value: string | null
  placeholder: React.ReactNode
  saveLabel: string
  displayValue?: (value: string) => React.ReactNode
  // Throw to keep the cell in edit mode (e.g. a failed request); resolve to commit.
  onSave: (value: string) => Promise<void>
}

export function InlineEditCell({ value, placeholder, saveLabel, displayValue, onSave }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setDraft(value ?? "")
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } catch {
      // keep editing so the user can retry
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          className="bg-surface border border-line-2 rounded px-2 py-1 text-sm text-fg focus:outline-none focus:border-yellow-500 w-32"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") setEditing(false)
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs text-accent hover:text-accent-hi disabled:opacity-50"
        >
          {saving ? "…" : saveLabel}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-subtle hover:text-fg">
          ✕
        </button>
      </div>
    )
  }

  return (
    <button onClick={startEdit} className="text-fg-3 hover:text-accent transition-colors text-left">
      {value ? (displayValue ? displayValue(value) : value) : <span className="text-faint italic">{placeholder}</span>}
    </button>
  )
}
