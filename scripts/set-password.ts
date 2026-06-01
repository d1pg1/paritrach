import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const [username, newPassword] = process.argv.slice(2)

if (!username || !newPassword) {
  console.error("Usage: npm run set-password <username> <newpassword>")
  process.exit(1)
}

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) } as any)

async function main() {
  const hash = await bcrypt.hash(newPassword, 12)
  await db.user.update({ where: { username }, data: { passwordHash: hash } })
  console.log(`Password updated for: ${username}`)
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
