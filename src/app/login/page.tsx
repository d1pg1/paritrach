"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"
import { loginAction } from "./actions"

const inputClass =
  "w-full bg-surface border border-line-2 text-fg placeholder-subtle rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-yellow-400"

export default function LoginPage() {
  const t = useTranslations("login")
  const [error, formAction, pending] = useActionState(loginAction, "")

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen px-4">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2 text-accent tracking-widest uppercase">PariTrach</h1>
        <p className="text-center text-muted mb-8 text-sm">
          {t("subtitle")}
        </p>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("username")}</label>
            <input
              name="username"
              type="text"
              className={inputClass}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("password")}</label>
            <input
              name="password"
              type="password"
              className={inputClass}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-lg py-2.5 transition-colors"
          >
            {pending ? t("signingIn") : t("signIn")}
          </button>
        </form>
      </div>
    </div>
  )
}
