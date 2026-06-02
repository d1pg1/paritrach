"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { UserAvatar } from "@/components/UserAvatar"

interface UserRow {
  id: string
  username: string
  nickname: string | null
  logoUrl: string | null
  role: string
  createdAt: string | Date
  _count: { bets: number }
}

export function UsersManager({ initialUsers }: { initialUsers: UserRow[] }) {
  const t = useTranslations("adminUsers")
  const router = useRouter()

  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNickname, setEditNickname] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError("")
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword }),
    })
    const data = await res.json().catch(() => ({}))
    setCreating(false)
    if (!res.ok) {
      setCreateError(data.message ?? "Error creating user")
      return
    }
    setNewUsername("")
    setNewPassword("")
    setUsers((prev) => [...prev, data])
    router.refresh()
  }

  function startEdit(user: UserRow) {
    setEditingId(user.id)
    setEditNickname(user.nickname ?? "")
  }

  async function handleSaveNickname(id: string) {
    setSavingId(id)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: editNickname }),
    })
    const data = await res.json().catch(() => ({}))
    setSavingId(null)
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, nickname: data.nickname } : u)))
      setEditingId(null)
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    setDeletingId(null)
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id))
      router.refresh()
    }
  }

  async function handleLogoUpload(id: string, file: File) {
    setUploadingId(id)
    const form = new FormData()
    form.append("logo", file)
    const res = await fetch(`/api/admin/users/${id}/logo`, { method: "POST", body: form })
    const data = await res.json().catch(() => ({}))
    setUploadingId(null)
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, logoUrl: data.logoUrl } : u)))
    }
  }

  async function handleLogoRemove(id: string) {
    setUploadingId(id)
    const res = await fetch(`/api/admin/users/${id}/logo`, { method: "DELETE" })
    setUploadingId(null)
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, logoUrl: null } : u)))
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex items-end gap-2 mb-8">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">{t("usernameLabel")}</label>
          <input
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500"
            placeholder={t("usernameLabel")}
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">{t("passwordLabel")}</label>
          <input
            type="password"
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500"
            placeholder={t("passwordLabel")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 bg-yellow-500 text-black text-sm font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors"
        >
          {creating ? "…" : t("create")}
        </button>
        {createError && <p className="text-red-400 text-sm">{createError}</p>}
      </form>

      {users.length === 0 ? (
        <p className="text-neutral-400">{t("noUsers")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400 border-b border-neutral-800">
                <th className="pb-3 pr-4 w-10">Logo</th>
                <th className="pb-3 pr-4">{t("usernameLabel")}</th>
                <th className="pb-3 pr-4">{t("nicknameLabel")}</th>
                <th className="pb-3 pr-4">{t("roleLabel")}</th>
                <th className="pb-3 pr-4 text-right">{t("betsCount")}</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-neutral-800/50">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => fileInputRefs.current[user.id]?.click()}
                        disabled={uploadingId === user.id}
                        title="Upload logo"
                        className="disabled:opacity-50"
                      >
                        <UserAvatar logoUrl={user.logoUrl} displayName={user.nickname ?? user.username} size={36} />
                      </button>
                      {user.logoUrl && (
                        <button
                          onClick={() => handleLogoRemove(user.id)}
                          disabled={uploadingId === user.id}
                          title="Remove logo"
                          className="text-neutral-600 hover:text-red-400 text-xs leading-none disabled:opacity-50"
                        >
                          ✕
                        </button>
                      )}
                      <input
                        ref={(el) => { fileInputRefs.current[user.id] = el }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleLogoUpload(user.id, file)
                          e.target.value = ""
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-medium text-white">{user.username}</td>
                  <td className="py-3 pr-4">
                    {editingId === user.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-yellow-500 w-32"
                          value={editNickname}
                          onChange={(e) => setEditNickname(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNickname(user.id)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                        />
                        <button
                          onClick={() => handleSaveNickname(user.id)}
                          disabled={savingId === user.id}
                          className="text-xs text-yellow-400 hover:text-yellow-300 disabled:opacity-50"
                        >
                          {savingId === user.id ? "…" : t("save")}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-neutral-500 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(user)}
                        className="text-neutral-300 hover:text-yellow-400 transition-colors text-left"
                      >
                        {user.nickname ?? <span className="text-neutral-600 italic">{t("noNickname")}</span>}
                      </button>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      user.role === "ADMIN"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-neutral-800 text-neutral-400"
                    }`}>
                      {user.role === "ADMIN" ? t("roleAdmin") : t("roleUser")}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right text-neutral-400">{user._count.bets}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(t("deleteConfirm", { username: user.username }))) {
                          handleDelete(user.id)
                        }
                      }}
                      disabled={user.role === "ADMIN" || deletingId === user.id}
                      className="text-xs text-neutral-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {deletingId === user.id ? "…" : t("deleteUser")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
