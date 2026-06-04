import { NextResponse } from "next/server"
import { getTeamRecentMatches, getH2HMatches } from "@/lib/apis/espn-history"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const home = searchParams.get("home")
  const away = searchParams.get("away")
  const type = searchParams.get("type") // "home" | "away" | "h2h"

  if (!home || !away || !type) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  try {
    let matches
    if (type === "h2h") {
      matches = await getH2HMatches(home, away)
    } else if (type === "away") {
      matches = await getTeamRecentMatches(away)
    } else {
      matches = await getTeamRecentMatches(home)
    }
    return NextResponse.json({ matches })
  } catch {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
