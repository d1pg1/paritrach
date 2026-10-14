import { db } from "@/lib/db"
import { NextResponse } from "next/server"

// Public on purpose: avatars aren't sensitive, and a public response is what lets the
// Vercel CDN and browsers cache it. Callers use a versioned URL (?v=...), so a new
// upload changes the URL and the year-long immutable cache never serves a stale image.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const avatar = await db.userAvatar.findUnique({
    where: { userId: id },
    select: { data: true, mimeType: true },
  })
  if (!avatar) return new NextResponse("Not found", { status: 404 })

  return new NextResponse(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
