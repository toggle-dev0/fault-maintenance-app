import Link from "next/link"
import { notFound } from "next/navigation"

import AppHeader from "@/components/app-shell/app-header"
import AdminNavigation from "@/components/admin/admin-navigation"
import { LogoWordmark } from "@/components/illustrations"
import { requireReadyUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { USER_ROLES } from "@/types/fault"

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requireReadyUser()

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  const userId = authData?.claims?.sub

  if (!userId) {
    notFound()
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (profile?.role !== USER_ROLES[2]) {
    notFound()
  }

  const displayName = profile.display_name ?? authData.claims.email ?? "Admin"

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden min-h-screen w-[232px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        <Link href="/admin" aria-label="FixTrack admin home" className="p-6">
          <LogoWordmark
            aria-hidden="true"
            className="h-8 w-28 sm:h-9 sm:w-[126px]"
          />
        </Link>
        <div className="mt-5">
          <AdminNavigation />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <AppHeader displayName={displayName} logoVisibility="mobile-only" />
        <AdminNavigation mobile />
        {children}
      </div>
    </div>
  )
}
