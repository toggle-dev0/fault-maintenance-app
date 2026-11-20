import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { USER_ROLES } from "@/types/fault"

export type CurrentUser = {
  id: string
  email: string | null
  mustChangePassword: boolean
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (typeof claims?.sub !== "string") {
    return null
  }

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    mustChangePassword: claims.app_metadata?.must_change_password === true,
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

export async function requireReadyUser(): Promise<CurrentUser> {
  const user = await requireUser()

  if (user.mustChangePassword) {
    redirect("/account/password")
  }

  return user
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireReadyUser()
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (profile?.role !== USER_ROLES[2]) {
    notFound()
  }

  return user
}
