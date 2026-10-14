"use client"

import { useTranslations } from "next-intl"

// The current theme lives on <html data-theme>, set server-side from the THEME
// cookie, so the icon is chosen in CSS (light: variant) and needs no state.
export function ThemeSwitcher() {
  const t = useTranslations("nav")

  function toggle() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light"
    document.documentElement.dataset.theme = next
    document.cookie = `THEME=${next}; path=/; max-age=31536000`
  }

  return (
    <button
      onClick={toggle}
      className="text-sm px-1.5 py-1 rounded text-subtle hover:text-fg-3 transition-colors"
    >
      <span className="light:hidden" title={t("lightTheme")} aria-label={t("lightTheme")}>☀</span>
      <span className="hidden light:inline" title={t("darkTheme")} aria-label={t("darkTheme")}>☾</span>
    </button>
  )
}
