import "dotenv/config"
import { db } from "@/lib/db"
import { saveUserAvatar } from "@/lib/user-avatar"
import fs from "fs"

const [username, imagePath] = process.argv.slice(2)
if (!username || !imagePath) {
  console.error("Usage: npx tsx scripts/set-logo.ts <username> <path-to-image>")
  process.exit(1)
}

async function main() {
  const user = await db.user.findUniqueOrThrow({
    where: { username },
    select: { id: true, username: true, nickname: true },
  })
  await saveUserAvatar(user.id, fs.readFileSync(imagePath))
  console.log("Logo set for:", user.username, user.nickname)
}

main().catch(console.error).finally(() => db.$disconnect())
