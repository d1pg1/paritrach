import { auth } from "@/lib/auth"
import { signOut } from "@/lib/auth"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"
import { RulesHelpButton } from "@/components/RulesHelpButton"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const t = await getTranslations("nav")

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-line bg-page">
        {/* Phones: two rows (logo + controls, then links + username). sm+: one row. */}
        <div className="max-w-5xl mx-auto px-4 py-2 sm:py-0 sm:h-14 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-6 gap-y-1">
          <Link
            href="/rounds"
            className="font-bold text-accent text-base sm:text-lg tracking-wider sm:tracking-widest uppercase"
          >
            PariTrach
          </Link>
          <nav className="order-last sm:order-none w-full sm:w-auto sm:mr-auto flex items-center gap-4 sm:gap-6">
            <Link
              href="/rounds"
              className="text-sm text-fg-3 hover:text-accent transition-colors"
            >
              {t("rounds")}
            </Link>
            <Link
              href="/scoreboard"
              className="text-sm text-fg-3 hover:text-accent transition-colors"
            >
              {t("scoreboard")}
            </Link>
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-sm text-accent-2 hover:text-accent transition-colors"
              >
                {t("admin")}
              </Link>
            )}
            <span className="sm:hidden ml-auto min-w-0 truncate text-sm text-muted">{session?.user?.name}</span>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <span className="hidden sm:inline max-w-40 truncate text-sm text-muted">{session?.user?.name}</span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <button
                type="submit"
                className="text-sm text-subtle hover:text-accent transition-colors whitespace-nowrap"
              >
                {t("signOut")}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <RulesHelpButton />
    </div>
  )
}
