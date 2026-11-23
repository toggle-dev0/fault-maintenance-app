import AppHeader from "@/components/app-shell/app-header"
import { requireTechnician } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function AssignmentsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await requireTechnician()
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    throw error
  }

  const displayName = profile?.display_name ?? user.email ?? "Technician"

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        displayName={displayName}
        logoHref="/assignments"
      />
      {children}
    </div>
  )
}
