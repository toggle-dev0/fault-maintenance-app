import { redirect } from "next/navigation"
import { z } from "zod"

import { LoginSignupForm } from "@/components/auth/login-signup-form"
import { createClient } from "@/lib/supabase/server"

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

const signupSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Full name must be 100 characters or fewer"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  organization: z
    .string()
    .trim()
    .min(1, "Organization is required")
    .max(120, "Organization must be 120 characters or fewer"),
  password: z.string().min(8, "At least 8 characters"),
})

type FieldErrorResult = {
  error: { issues: Array<{ path: unknown[]; message: string }> }
}

function fieldErrorsToObject(result: FieldErrorResult) {
  const errors: Record<string, string> = {}

  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (typeof key === "string" || typeof key === "number") {
      errors[String(key)] = issue.message
    }
  }

  return errors
}

async function getClaims() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims ?? null
}

export async function loginAction(formData: FormData) {
  "use server"

  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  const parsed = loginSchema.safeParse({ email, password })
  if (!parsed.success) {
    return {
      fieldErrors: fieldErrorsToObject(parsed),
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return {
      error: "Unable to sign in. Please check your details and try again.",
    }
  }

  redirect("/")
}

export async function signupAction(formData: FormData) {
  "use server"

  const full_name = String(formData.get("full_name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const organization = String(formData.get("organization") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  const parsed = signupSchema.safeParse({
    full_name,
    email,
    organization,
    password,
  })
  if (!parsed.success) {
    return {
      fieldErrors: fieldErrorsToObject(parsed),
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        organization: parsed.data.organization,
      },
    },
  })

  if (error) {
    console.error("Supabase sign-up failed", {
      code: error.code,
      status: error.status,
    })

    return {
      error:
        error.code === "weak_password"
          ? "Choose a stronger password and try again."
          : error.code === "over_email_send_rate_limit"
            ? "Too many sign-up attempts. Wait a little and try again."
            : "Unable to create account. Please try again.",
    }
  }

  redirect("/")
}

export default async function LoginPage() {
  const claims = await getClaims()

  if (claims) {
    redirect("/")
  }

  return (
    <LoginSignupForm loginAction={loginAction} signupAction={signupAction} />
  )
}
