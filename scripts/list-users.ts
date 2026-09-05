import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) } as any)

async function main() {
  const users = await db.user.findMany({
    select: { username: true, nickname: true, role: true, telegramUsername: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  console.table(
    users.map((u: any) => ({
      username: u.username,
      nickname: u.nickname ?? "",
      role: u.role,
      telegram: u.telegramUsername ?? "",
      created: u.createdAt.toISOString().slice(0, 10),
    }))
  )
  console.log("Total users:", users.length)
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
