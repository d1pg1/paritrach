import { auth } from "@/lib/auth"
import { signOut } from "@/lib/auth"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const t = await getTranslations("nav")

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-neutral-800 bg-black">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-6">
            <Link href="/rounds" className="font-bold text-yellow-400 text-lg tracking-widest uppercase">
              PariTrach
            </Link>
            <Link
              href="/rounds"
              className="text-sm text-neutral-300 hover:text-yellow-400 transition-colors"
            >
              {t("rounds")}
            </Link>
            <Link
              href="/scoreboard"
              className="text-sm text-neutral-300 hover:text-yellow-400 transition-colors"
            >
              {t("scoreboard")}
            </Link>
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-sm text-yellow-500 hover:text-yellow-400 transition-colors"
              >
                {t("admin")}
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="text-sm text-neutral-400">{session?.user?.name}</span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <button
                type="submit"
                className="text-sm text-neutral-500 hover:text-yellow-400 transition-colors"
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
    </div>
  )
}
