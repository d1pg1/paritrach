import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg(process.env.DATABASE_URL!)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new PrismaClient({ adapter } as any)

async function main() {
  const hash = await bcrypt.hash("admin123", 12)
  const admin = await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", passwordHash: hash, role: "ADMIN" },
  })
  console.log("Admin user ready:", admin.username)

  const users = ["dima", "danya", "sasha", "daryna"]
  for (const name of users) {
    const h = await bcrypt.hash("pass123", 12)
    await db.user.upsert({
      where: { username: name },
      update: {},
      create: { username: name, passwordHash: h, role: "USER" },
    })
    console.log("User ready:", name)
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
