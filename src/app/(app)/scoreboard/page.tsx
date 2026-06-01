import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTranslations } from "next-intl/server"

export default async function ScoreboardPage() {
  const session = await auth()
  if (!session?.user) return null

  const t = await getTranslations("scoreboard")

  const bets = await db.bet.findMany({
    where: { isWinner: true },
    include: { user: { select: { id: true, username: true } } },
  })

  const map = new Map<string, { username: string; points: number; coefSum: number }>()
  for (const bet of bets) {
    const entry = map.get(bet.userId) ?? { username: bet.user.username, points: 0, coefSum: 0 }
    entry.points += 1
    entry.coefSum += bet.coefficient
    map.set(bet.userId, entry)
  }

  const rows = [...map.values()].sort((a, b) =>
    b.points !== a.points ? b.points - a.points : b.coefSum - a.coefSum
  )

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      {rows.length === 0 ? (
        <p className="text-neutral-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400 border-b border-neutral-800">
                <th className="pb-3 pr-4 w-10">{t("rank")}</th>
                <th className="pb-3 pr-4">{t("player")}</th>
                <th className="pb-3 pr-4 text-right">{t("points")}</th>
                <th className="pb-3 text-right">{t("coefSum")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.username}
                  className={`border-b border-neutral-800/50 ${
                    row.username === session.user.name ? "text-yellow-400" : ""
                  }`}
                >
                  <td className="py-3 pr-4 font-mono text-neutral-500">{i + 1}</td>
                  <td className="py-3 pr-4 font-medium">{row.username}</td>
                  <td className="py-3 pr-4 text-right font-bold">{row.points}</td>
                  <td className="py-3 text-right text-neutral-400">{row.coefSum.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
