import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { cookies } from "next/headers"
import "./globals.css"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin", "cyrillic"] })

export const metadata: Metadata = {
  title: "PariTrach",
  description: "Friendly World Cup betting — no real money",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  const theme = (await cookies()).get("THEME")?.value === "light" ? "light" : "dark"

  return (
    <html lang={locale} data-theme={theme} className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-page text-fg flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
