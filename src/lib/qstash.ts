import { Receiver } from "@upstash/qstash"

export async function scheduleReminder(roundId: string, fireAt: Date): Promise<string> {
  const token = process.env.QSTASH_TOKEN
  if (!token) throw new Error("QStash not configured")

  const destination = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/reminder`
  const notBefore = Math.floor(fireAt.getTime() / 1000)

  const res = await fetch(`https://qstash.upstash.io/v2/publish/${destination}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Not-Before": String(notBefore),
    },
    body: JSON.stringify({ roundId }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`QStash publish failed: ${res.status} ${body}`)
  }

  const { messageId } = await res.json()
  return messageId
}

// Cancels a scheduled message that hasn't fired yet (e.g. round was deleted).
// Safe to call on an already-delivered/cancelled message — QStash just 404s, which we swallow.
export async function cancelReminder(messageId: string): Promise<void> {
  const token = process.env.QSTASH_TOKEN
  if (!token) throw new Error("QStash not configured")

  const res = await fetch(`https://qstash.upstash.io/v2/messages/${messageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => "")
    throw new Error(`QStash cancel failed: ${res.status} ${body}`)
  }
}

export async function verifyQStashRequest(req: Request): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY
  if (!currentSigningKey || !nextSigningKey) return false

  const signature = req.headers.get("Upstash-Signature")
  if (!signature) return false

  // clone so the caller can still read the body (e.g. req.json()) afterwards
  const body = await req.clone().text()
  const receiver = new Receiver({ currentSigningKey, nextSigningKey })

  try {
    return await receiver.verify({ signature, body })
  } catch {
    return false
  }
}
