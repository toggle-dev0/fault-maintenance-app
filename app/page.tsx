import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { logoutAction } from "@/lib/actions"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    redirect("/login")
  }

  const userId = claims.sub
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const displayName = profile?.display_name ?? claims.email ?? "User"

  if (profile?.role === "user") {
    redirect("/faults")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-[24px] border border-border bg-card p-8 text-center shadow-[var(--shadow-floating)]">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Signed in</p>
        <h1 className="mt-4 font-heading text-[2.5rem] leading-none tracking-[-0.06em] text-foreground">
          {displayName}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Role: {profile?.role ?? "Unavailable"}
        </p>

        <form action={logoutAction} className="mt-8">
          <Button type="submit" className="w-full rounded-[16px] bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90">
            Log out
          </Button>
        </form>
      </div>
    </main>
  )
}
