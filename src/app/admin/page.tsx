import { db } from "@/lib/db"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { CreateRoundForm } from "./CreateRoundForm"
import { CreateSeasonForm } from "./CreateSeasonForm"
import { StartSeasonForm } from "./StartSeasonForm"
import { CurrentSeasonNameEditor } from "./CurrentSeasonNameEditor"

const STATUS_COLOR: Record<string, string> = {
  SETUP: "text-neutral-500",
  BETTING: "text-yellow-400",
  CLOSED: "text-neutral-400",
  RESULTS: "text-white",
}

interface RoundRow {
  id: string
  name: string
  status: string
  _count: { matches: number; bets: number }
}

export default async function AdminPage() {
  const t = await getTranslations("admin")

  const [rounds, settings] = await Promise.all([
    db.round.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { matches: true, bets: true } },
      },
    }),
    db.settings.findUnique({ where: { id: "singleton" } }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/contestants"
            className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-lg px-4 py-2 text-sm transition-colors"
          >
            {t("contestants")}
          </Link>
          <CreateSeasonForm initialName={settings?.currentSeasonName ?? null} />
          <StartSeasonForm />
          <CreateRoundForm />
        </div>
      </div>

      <CurrentSeasonNameEditor initialName={settings?.currentSeasonName ?? null} />

      {rounds.length === 0 ? (
        <p className="text-neutral-400">{t("noRounds")}</p>
      ) : (
        <div className="space-y-3">
          {(rounds as RoundRow[]).map((r) => (
            <Link
              key={r.id}
              href={`/admin/rounds/${r.id}`}
              className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4 hover:border-yellow-500 transition-colors"
            >
              <div>
                <p className="font-semibold text-white">{r.name}</p>
                <p className="text-sm text-neutral-400 mt-0.5">
                  {t("matchesCount", { matches: r._count.matches, bets: r._count.bets })}
                </p>
              </div>
              <span className={`text-sm font-medium ${STATUS_COLOR[r.status]}`}>
                {r.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
