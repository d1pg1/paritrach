import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { ContestantsForm } from "./ContestantsForm"

export default async function ContestantsPage() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") redirect("/")

  const t = await getTranslations("admin")

  const [allUsers, currentContestants] = await Promise.all([
    db.user.findMany({
      select: { id: true, username: true, nickname: true },
      orderBy: { username: "asc" },
    }),
    db.seasonContestant.findMany({
      where: { seasonId: null },
      select: { userId: true },
    }),
  ])

  const contestantIds = new Set(currentContestants.map((c) => c.userId))
  const users = allUsers.map((u) => ({ ...u, isContestant: contestantIds.has(u.id) }))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{t("contestantsTitle")}</h1>
      <p className="text-sm text-neutral-400 mb-6">{t("contestantsSubtitle")}</p>
      <ContestantsForm users={users} />
    </div>
  )
}
