import { redirect } from "next/navigation"

import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { Button } from "@/components/ui/button"
import { changePasswordAction } from "@/app/(auth)/change-password/actions"
import { logoutAction } from "@/lib/actions"
import { createClient } from "@/lib/supabase/server"
import { USER_ROLES } from "@/types/fault"

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  const claims = authData?.claims

  if (!claims) {
    redirect("/login")
  }

  if (claims.app_metadata?.must_change_password !== true || !claims.sub) {
    redirect("/")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (profile?.role !== USER_ROLES[1]) {
    redirect("/")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-md rounded-[24px] border border-border bg-card p-6 shadow-[var(--shadow-floating)] sm:p-8">
        <h1 className="font-heading text-3xl tracking-tight text-foreground">
          Change your password
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Set a personal password before continuing to your assignments.
        </p>
        <ChangePasswordForm action={changePasswordAction} />
        <form action={logoutAction} className="mt-3">
          <Button
            type="submit"
            variant="ghost"
            className="h-11 w-full rounded-[12px] text-sm"
          >
            Sign out
          </Button>
        </form>
      </section>
    </main>
  )
}
