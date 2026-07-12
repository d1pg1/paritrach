import { Client, QstashError, Receiver } from "@upstash/qstash"

function getClient(): Client {
  const token = process.env.QSTASH_TOKEN
  if (!token) throw new Error("QStash not configured")
  return new Client({ token })
}

// Vercel sets VERCEL_URL automatically as a fallback when NEXT_PUBLIC_APP_URL
// hasn't been configured for the deployment.
function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL (or VERCEL_URL) is not configured")
  return url
}

export async function scheduleReminder(roundId: string, fireAt: Date): Promise<string> {
  const { messageId } = await getClient().publishJSON({
    url: `${getAppUrl()}/api/telegram/reminder`,
    body: { roundId },
    notBefore: Math.floor(fireAt.getTime() / 1000),
  })
  return messageId
}

// Cancels a scheduled message that hasn't fired yet (e.g. round was deleted).
// Safe to call on an already-delivered/cancelled message — QStash 404s, which we swallow.
export async function cancelReminder(messageId: string): Promise<void> {
  try {
    await getClient().messages.cancel(messageId)
  } catch (err) {
    if (err instanceof QstashError && err.status === 404) return
    throw err
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
