"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { USER_ROLES } from "@/types/fault"

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })

export type ChangePasswordState = {
  error: string | null
}

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a new password." }
  }

  const supabase = await createClient()
  const { data: authData, error: claimsError } = await supabase.auth.getClaims()
  const claims = authData?.claims
  const userId = claims?.sub

  if (
    claimsError ||
    !userId ||
    claims?.app_metadata?.must_change_password !== true
  ) {
    return { error: "Your session has expired. Sign in again to continue." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) {
    return { error: "Unable to verify your account. Please try again." }
  }

  if (profile?.role !== USER_ROLES[1]) {
    return { error: "This password-change step is for technicians only." }
  }

  let adminClient: ReturnType<typeof createAdminClient>
  try {
    adminClient = createAdminClient()
  } catch {
    return {
      error:
        "Your account setup could not be completed. Contact an administrator for help.",
    }
  }

  let passwordUpdateError: { code?: string } | null = null
  try {
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    })
    passwordUpdateError = error
  } catch {
    return { error: "Unable to update your password. Please try again." }
  }

  if (passwordUpdateError) {
    return {
      error:
        passwordUpdateError.code === "weak_password"
          ? "Choose a stronger password and try again."
          : "Unable to update your password. Please try again.",
    }
  }

  const appMetadata = claims.app_metadata ?? {}
  let metadataCleared = false
  try {
    const { data, error } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          ...appMetadata,
          must_change_password: false,
        },
      }
    )
    metadataCleared =
      !error && data.user?.app_metadata.must_change_password === false
  } catch {
    metadataCleared = false
  }

  if (!metadataCleared) {
    return {
      error:
        "Your password was changed, but account setup is still restricted. Contact an administrator to finish activating your account.",
    }
  }

  try {
    const { error } = await supabase.auth.refreshSession()
    if (error) {
      return {
        error:
          "Your password was changed, but your session could not be refreshed. Sign out and sign in again with your new password.",
      }
    }
  } catch {
    return {
      error:
        "Your password was changed, but your session could not be refreshed. Sign out and sign in again with your new password.",
    }
  }

  redirect("/")
}
