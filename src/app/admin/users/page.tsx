import { db } from "@/lib/db"
import { getTranslations } from "next-intl/server"
import { UsersManager } from "./UsersManager"

export default async function AdminUsersPage() {
  const t = await getTranslations("adminUsers")

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      nickname: true,
      role: true,
      createdAt: true,
      _count: { select: { bets: true } },
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      <UsersManager initialUsers={users} />
    </div>
  )
}
