import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { settleRound } from "@/lib/settle-round"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params
  const result = await settleRound(id)
  return NextResponse.json(result)
}
