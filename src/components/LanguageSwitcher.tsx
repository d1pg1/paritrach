"use client"

import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "uk", label: "UA" },
  { code: "pl", label: "PL" },
]

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()

  function switchLocale(code: string) {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`
    router.refresh()
  }

  return (
    <div className="flex gap-0.5">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          className={`text-xs px-1.5 py-1 rounded transition-colors ${
            locale === code
              ? "text-yellow-400 font-semibold"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
