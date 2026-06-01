import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"

const locales = ["en", "ru", "uk", "pl"]

export default getRequestConfig(async () => {
  const locale = (await cookies()).get("NEXT_LOCALE")?.value
  const validLocale = locales.includes(locale ?? "") ? locale! : "en"
  return {
    locale: validLocale,
    messages: (await import(`../../messages/${validLocale}.json`)).default,
  }
})
