// One-off: moves avatars stored as base64 data URIs in User.logoUrl into the UserAvatar
// table and replaces logoUrl with the cached /api/users/[id]/avatar URL. Safe to re-run:
// users whose logoUrl is no longer a data URI are skipped.
import "dotenv/config"
import { db } from "@/lib/db"
import { saveUserAvatar } from "@/lib/user-avatar"

async function main() {
  const users = await db.user.findMany({
    where: { logoUrl: { startsWith: "data:" } },
    select: { id: true, username: true, logoUrl: true },
  })
  console.log(`Found ${users.length} users with data-URI avatars`)

  for (const user of users) {
    const base64 = user.logoUrl!.slice(user.logoUrl!.indexOf(",") + 1)
    const before = user.logoUrl!.length
    const logoUrl = await saveUserAvatar(user.id, Buffer.from(base64, "base64"))
    const after = (await db.userAvatar.findUniqueOrThrow({ where: { userId: user.id } })).data.length
    console.log(`  ${user.username}: ${(before / 1024).toFixed(0)}KB data URI -> ${(after / 1024).toFixed(1)}KB image at ${logoUrl}`)
  }
}

main().catch(console.error).finally(() => db.$disconnect())
