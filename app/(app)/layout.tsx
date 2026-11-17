import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { USER_ROLES } from "@/types/fault"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  const claims = authData?.claims

  if (claims?.app_metadata?.must_change_password === true && claims.sub) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", claims.sub)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (profile?.role === USER_ROLES[1]) {
      redirect("/change-password")
    }
  }

  return children
}
