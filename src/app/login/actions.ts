"use server"

import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"
import { getTranslations } from "next-intl/server"

export async function loginAction(_prev: string, formData: FormData): Promise<string> {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/rounds",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const t = await getTranslations("login")
      return t("invalidCredentials")
    }
    throw error // re-throw NEXT_REDIRECT so Next.js performs the navigation
  }
  return ""
}
