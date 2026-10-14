import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { deleteUserAvatar, saveUserAvatar } from "@/lib/user-avatar"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params

  const formData = await req.formData()
  const file = formData.get("logo") as File | null
  if (!file) return NextResponse.json({ message: "No file provided" }, { status: 400 })

  const logoUrl = await saveUserAvatar(id, Buffer.from(await file.arrayBuffer()))

  return NextResponse.json({ id, logoUrl })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params

  await deleteUserAvatar(id)

  return NextResponse.json({ id, logoUrl: null })
}
