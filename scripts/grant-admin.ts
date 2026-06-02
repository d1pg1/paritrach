// Usage: npx tsx scripts/grant-admin.ts <username>
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"

dotenv.config()

const username = process.argv[2]
if (!username) {
  console.error("Usage: npx tsx scripts/grant-admin.ts <username>")
  process.exit(1)
}

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const db = new PrismaClient({ adapter })

async function main() {
  const user = await db.user.findUnique({ where: { username } })
  if (!user) {
    console.error(`User "${username}" not found.`)
    process.exit(1)
  }
  if (user.role === "ADMIN") {
    console.log(`User "${username}" is already an admin.`)
    process.exit(0)
  }
  await db.user.update({ where: { username }, data: { role: "ADMIN" } })
  console.log(`Granted ADMIN role to "${username}".`)
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => db.$disconnect())
