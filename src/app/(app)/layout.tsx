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
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-6">
            <Link href="/rounds" className="font-bold text-accent text-lg tracking-widest uppercase">
              PariTrach
            </Link>
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
          </nav>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <span className="text-sm text-muted">{session?.user?.name}</span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <button
                type="submit"
                className="text-sm text-subtle hover:text-accent transition-colors"
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
