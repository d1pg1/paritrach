import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") redirect("/")

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-yellow-900/30 bg-yellow-950/10">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-6">
          <Link href="/" className="text-sm text-neutral-400 hover:text-white">
            ← App
          </Link>
          <span className="text-yellow-600 font-semibold text-sm tracking-wide uppercase">Admin Panel</span>
          <Link href="/admin" className="text-sm text-neutral-400 hover:text-white">
            Rounds
          </Link>
          <Link href="/admin/users" className="text-sm text-neutral-400 hover:text-white">
            Users
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  )
}
