import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const [username, role] = process.argv.slice(2)

if (!username || !["ADMIN", "USER"].includes(role)) {
  console.error("Usage: npm run set-role <username> <ADMIN|USER>")
  process.exit(1)
}

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) } as any)

async function main() {
  await db.user.update({ where: { username }, data: { role: role as "ADMIN" | "USER" } })
  console.log(`Role updated: ${username} → ${role}`)
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
