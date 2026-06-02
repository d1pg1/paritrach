import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import fs from "fs"

const [username, imagePath] = process.argv.slice(2)
if (!username || !imagePath) {
  console.error("Usage: npx tsx scripts/set-logo.ts <username> <path-to-image>")
  process.exit(1)
}

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) } as any)

async function main() {
  const logoUrl = fs.readFileSync(imagePath, "utf8")
  const user = await db.user.update({
    where: { username },
    data: { logoUrl },
    select: { id: true, username: true, nickname: true },
  })
  console.log("Logo set for:", user.username, user.nickname)
}

main().catch(console.error).finally(() => db.$disconnect())
