import sharp from "sharp"
import { db } from "@/lib/db"

// Avatars render at 24–36px; 128px keeps them sharp on 3x screens at a few KB each.
const AVATAR_SIZE = 128
const AVATAR_MIME = "image/webp"

export function avatarUrl(userId: string, version: Date): string {
  return `/api/users/${userId}/avatar?v=${version.getTime()}`
}

// Resizes the image, stores the bytes in UserAvatar and points User.logoUrl at the
// cached avatar route. The ?v= version changes on every upload so browsers refetch.
export async function saveUserAvatar(userId: string, image: Buffer): Promise<string> {
  const webp = await sharp(image)
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
    .webp({ quality: 85 })
    .toBuffer()
  const data = new Uint8Array(webp)

  const avatar = await db.userAvatar.upsert({
    where: { userId },
    update: { data, mimeType: AVATAR_MIME },
    create: { userId, data, mimeType: AVATAR_MIME },
    select: { updatedAt: true },
  })
  const logoUrl = avatarUrl(userId, avatar.updatedAt)
  await db.user.update({ where: { id: userId }, data: { logoUrl } })
  return logoUrl
}

export async function deleteUserAvatar(userId: string): Promise<void> {
  await db.userAvatar.deleteMany({ where: { userId } })
  await db.user.update({ where: { id: userId }, data: { logoUrl: null } })
}
