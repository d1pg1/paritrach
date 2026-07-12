export async function sendGroupMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID
  if (!token || !chatId) throw new Error("Telegram bot not configured")

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`)
  }
}
