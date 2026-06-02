import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import sharp from "sharp"

const AVATAR_SIZE = 256

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params

  const formData = await req.formData()
  const file = formData.get("logo") as File | null
  if (!file) return NextResponse.json({ message: "No file provided" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  const webpBuffer = await sharp(buffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
    .webp({ quality: 85 })
    .toBuffer()

  const logoUrl = `data:image/webp;base64,${webpBuffer.toString("base64")}`

  const user = await db.user.update({
    where: { id },
    data: { logoUrl },
    select: { id: true, logoUrl: true },
  })

  return NextResponse.json(user)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params

  const user = await db.user.update({
    where: { id },
    data: { logoUrl: null },
    select: { id: true, logoUrl: true },
  })

  return NextResponse.json(user)
}
