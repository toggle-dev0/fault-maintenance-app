import { redirect } from "next/navigation"

import AppHeader from "@/components/app-shell/app-header"
import { createClient } from "@/lib/supabase/server"

export default async function FaultsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    redirect("/login")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", claims.sub)
    .maybeSingle()

  if (error) {
    throw error
  }

  const displayName = profile?.display_name ?? claims.email ?? "User"

  return (
    <div className="min-h-screen bg-background">
      <AppHeader displayName={displayName} />
      {children}
    </div>
  )
}
