"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { changePasswordSchema } from "@/lib/auth/password-schema"
import type {
  ChangePasswordResult,
  PasswordField,
} from "@/lib/auth/password-schema"
import { getCurrentUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const adminUpdateFailure =
  "Your password was changed, but we could not finish setting up your account. Please change it again to complete setup."

function getFieldErrors(
  error: z.ZodError
): NonNullable<ChangePasswordResult["fieldErrors"]> {
  const fieldErrors: Partial<Record<PasswordField, string>> = {}

  for (const issue of error.issues) {
    const field = issue.path[0]

    if (
      (field === "currentPassword" ||
        field === "newPassword" ||
        field === "confirmPassword") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message
    }
  }

  return fieldErrors
}

export async function changePassword(
  formData: FormData
): Promise<ChangePasswordResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    return { fieldErrors: getFieldErrors(parsed.error) }
  }

  const user = await getCurrentUser()

  if (!user) {
    return { error: "You are signed out. Please log in again." }
  }

  if (!user.email) {
    return { error: "Unable to verify your account. Please log in again." }
  }

  const supabase = await createClient()
  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  })

  if (verificationError) {
    return {
      fieldErrors: { currentPassword: "Current password is incorrect." },
    }
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })

  if (passwordError) {
    return {
      error:
        passwordError.code === "weak_password"
          ? "Choose a stronger password."
          : passwordError.code === "same_password"
            ? "The new password must be different."
            : "Unable to change the password. Please try again.",
    }
  }

  if (user.mustChangePassword) {
    try {
      const adminClient = createAdminClient()
      const { data, error } = await adminClient.auth.admin.getUserById(user.id)

      if (error || !data.user) {
        return { error: adminUpdateFailure }
      }

      const { error: updateError } =
        await adminClient.auth.admin.updateUserById(user.id, {
          app_metadata: {
            ...data.user.app_metadata,
            must_change_password: false,
          },
        })

      if (updateError) {
        return { error: adminUpdateFailure }
      }
    } catch {
      return { error: adminUpdateFailure }
    }

    try {
      const { error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        return {
          error:
            "Your password was changed, but we could not refresh your session. Please log out and log in again.",
        }
      }
    } catch {
      return {
        error:
          "Your password was changed, but we could not refresh your session. Please log out and log in again.",
      }
    }

    redirect("/")
  }

  return { success: true }
}
