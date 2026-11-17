"use server"

import { randomInt } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { USER_ROLES } from "@/types/fault"

const passwordAlphabet =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
const passwordLength = 16
const genericError = "Unable to create the account. Please try again."
const permissionError = "You do not have permission to do this."

const technicianSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required.")
    .max(100, "Full name must be 100 characters or fewer."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .max(254, "Email must be 254 characters or fewer.")
    .email("Enter a valid email address."),
  organization: z
    .string()
    .trim()
    .max(120, "Hostel or organization must be 120 characters or fewer.")
    .transform((value) => value || null),
})

export type TechnicianFormField = "full_name" | "email" | "organization"

export type TechnicianActionResult = {
  fieldErrors: Partial<Record<TechnicianFormField, string>>
  formError: string | null
  account: { email: string; password: string } | null
}

function getFieldErrors(
  error: z.ZodError
): TechnicianActionResult["fieldErrors"] {
  const fieldErrors: TechnicianActionResult["fieldErrors"] = {}

  for (const issue of error.issues) {
    const field = issue.path[0]
    if (
      (field === "full_name" ||
        field === "email" ||
        field === "organization") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message
    }
  }

  return fieldErrors
}

function generatePassword() {
  return Array.from({ length: passwordLength }, () =>
    passwordAlphabet.charAt(randomInt(passwordAlphabet.length))
  ).join("")
}

function getGenericFailure(): TechnicianActionResult {
  return { fieldErrors: {}, formError: genericError, account: null }
}

export async function createTechnician(
  formData: FormData
): Promise<TechnicianActionResult> {
  const parsed = technicianSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    organization: formData.get("organization") ?? "",
  })

  if (!parsed.success) {
    return {
      fieldErrors: getFieldErrors(parsed.error),
      formError: null,
      account: null,
    }
  }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const callerId = authData?.claims?.sub

  if (authError || !callerId) {
    return { fieldErrors: {}, formError: permissionError, account: null }
  }

  const { data: callerProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .maybeSingle()

  if (profileError || callerProfile?.role !== USER_ROLES[2]) {
    return { fieldErrors: {}, formError: permissionError, account: null }
  }

  let adminClient: ReturnType<typeof createAdminClient>
  try {
    adminClient = createAdminClient()
  } catch {
    return getGenericFailure()
  }

  const password = generatePassword()

  let createUserResult: Awaited<
    ReturnType<typeof adminClient.auth.admin.createUser>
  >
  try {
    createUserResult = await adminClient.auth.admin.createUser({
      email: parsed.data.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.full_name,
        organization: parsed.data.organization,
      },
      app_metadata: { must_change_password: true },
    })
  } catch {
    return getGenericFailure()
  }

  if (createUserResult.error) {
    const message = createUserResult.error.message.toLowerCase()
    const isDuplicateEmail =
      createUserResult.error.code === "email_exists" ||
      (message.includes("already") && message.includes("registered"))

    return {
      fieldErrors: {},
      formError: isDuplicateEmail
        ? "An account with this email already exists."
        : genericError,
      account: null,
    }
  }

  const createdUser = createUserResult.data.user
  if (!createdUser) {
    return getGenericFailure()
  }

  let profileUpdated = false
  try {
    const { data: updatedProfile, error: updateError } = await adminClient
      .from("profiles")
      .update({ role: USER_ROLES[1] })
      .eq("id", createdUser.id)
      .select("id")
      .maybeSingle()

    profileUpdated = !updateError && updatedProfile?.id === createdUser.id
  } catch {
    profileUpdated = false
  }

  if (!profileUpdated) {
    try {
      await adminClient.auth.admin.deleteUser(createdUser.id)
    } catch {
      return getGenericFailure()
    }
    return getGenericFailure()
  }

  revalidatePath("/admin/staff")

  return {
    fieldErrors: {},
    formError: null,
    account: { email: parsed.data.email, password },
  }
}
