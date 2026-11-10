"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { AuthIllustration } from "@/components/illustrations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

const signupSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Full name must be 100 characters or fewer"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  organization: z
    .string()
    .trim()
    .min(1, "Organization is required")
    .max(120, "Organization must be 120 characters or fewer"),
  password: z.string().min(8, "At least 8 characters"),
})

type LoginValues = z.infer<typeof loginSchema>
type SignupValues = z.infer<typeof signupSchema>

type ServerResult = {
  fieldErrors?: Record<string, string>
  error?: string
}

type LoginSignupFormProps = {
  loginAction: (formData: FormData) => Promise<ServerResult | undefined>
  signupAction: (formData: FormData) => Promise<ServerResult | undefined>
}

type FormMode = "login" | "signup"

const tabClassName =
  "inline-flex h-12 items-center justify-center rounded-[16px] px-4 text-base font-semibold transition-all"

export function LoginSignupForm({ loginAction, signupAction }: LoginSignupFormProps) {
  const [mode, setMode] = useState<FormMode>("login")
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState("")

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: "", email: "", organization: "", password: "" },
  })

  const switchMode = (nextMode: FormMode) => {
    setMode(nextMode)
    setShowPassword(false)
    setFormError("")
    loginForm.clearErrors()
    signupForm.clearErrors()
  }

  const submitLogin = loginForm.handleSubmit(async (values) => {
    setFormError("")
    const formData = new FormData()
    formData.set("email", values.email)
    formData.set("password", values.password)

    const result = await loginAction(formData)

    if (result?.fieldErrors) {
      Object.entries(result.fieldErrors).forEach(([key, message]) => {
        loginForm.setError(key as keyof LoginValues, {
          type: "server",
          message,
        })
      })
    }

    if (result?.error) {
      setFormError(result.error)
    }
  })

  const submitSignup = signupForm.handleSubmit(async (values) => {
    setFormError("")
    const formData = new FormData()
    formData.set("full_name", values.full_name)
    formData.set("email", values.email)
    formData.set("organization", values.organization)
    formData.set("password", values.password)

    const result = await signupAction(formData)

    if (result?.fieldErrors) {
      Object.entries(result.fieldErrors).forEach(([key, message]) => {
        signupForm.setError(key as keyof SignupValues, {
          type: "server",
          message,
        })
      })
    }

    if (result?.error) {
      setFormError(result.error)
    }
  })

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col lg:flex-row lg:items-stretch lg:justify-between">
        <aside className="flex w-full flex-col justify-between bg-[#E9EBFF] px-4 pb-10 pt-8 text-foreground dark:bg-[#1E2A4B] sm:px-8 lg:w-[48%] lg:px-10 lg:pb-12 lg:pt-10">
          <div>
            <div className="font-heading text-[2.5rem] font-normal leading-none tracking-[-0.06em] text-foreground sm:text-[3.5rem] lg:text-[4rem]">
              FixTrack
            </div>
            <h1 className="mt-8 max-w-[630px] font-heading text-[2.8rem] leading-[0.9] tracking-[-0.06em] text-foreground sm:text-[4rem] lg:text-[5rem]">
              Report it. Track it. Get it fixed.
            </h1>
            <p className="mt-8 max-w-[540px] text-lg text-foreground/80">
              One place for hostels, offices and campuses to log faults and follow every repair.
            </p>

            <ul className="mt-8 space-y-4 text-base text-foreground/85 sm:text-lg">
              {[
                "Report a fault with a photo and location",
                "See who is fixing it and where it stands",
                "Confirm the repair and leave feedback",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex size-5 items-center justify-center rounded-full border border-primary text-primary">
                    <span className="block size-2.5 rounded-full bg-primary" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex justify-center lg:justify-start">
            <div className="flex h-[220px] w-[220px] items-center justify-center rounded-[28px] border-[3px] border-dashed border-primary/70 bg-primary/5 p-6 shadow-none sm:h-[260px] sm:w-[260px] lg:h-[310px] lg:w-[310px]">
              <AuthIllustration className="h-full w-full max-w-[180px] sm:max-w-[220px]" aria-hidden="true" />
            </div>
          </div>
        </aside>

        <section className="flex w-full items-center justify-center bg-background px-4 py-6 sm:px-6 lg:w-[52%] lg:px-8 lg:py-12">
          <div className="w-full max-w-[520px] rounded-[28px] border border-border bg-card p-3 shadow-[var(--shadow-floating)] dark:border-border/80 dark:bg-card/90 sm:p-5 lg:p-6">
            <div className="rounded-[22px] bg-muted/80 p-1.5 dark:bg-muted/40">
              <div role="group" aria-label="Authentication mode" className="grid grid-cols-2 gap-1.5 rounded-[18px] bg-transparent">
                <button
                  type="button"
                  aria-pressed={mode === "login"}
                  onClick={() => switchMode("login")}
                  className={cn(
                    tabClassName,
                    mode === "login"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Log in
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "signup"}
                  onClick={() => switchMode("signup")}
                  className={cn(
                    tabClassName,
                    mode === "signup"
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Sign up
                </button>
              </div>
            </div>

            <div className="mt-6 px-1 sm:px-2">
              <h2 className="font-heading text-[2.4rem] leading-none tracking-[-0.05em] text-foreground sm:text-[3rem]">
                {mode === "login" ? "Welcome back" : "Create an account"}
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                {mode === "login"
                  ? "Log in to report faults or manage repairs."
                  : "Report faults and follow their repairs."}
              </p>

              {mode === "login" ? (
                <form className="mt-6 space-y-5" noValidate onSubmit={submitLogin}>
                  {formError ? (
                    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {formError}
                    </p>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...loginForm.register("email")}
                      aria-invalid={Boolean(loginForm.formState.errors.email)}
                      aria-describedby={loginForm.formState.errors.email ? "login-email-error" : undefined}
                      className={cn(
                        "h-[52px] rounded-[16px] border border-input bg-input/70 text-base text-foreground placeholder:text-muted-foreground",
                        loginForm.formState.errors.email && "border-destructive shadow-none"
                      )}
                    />
                    {loginForm.formState.errors.email ? (
                      <p id="login-email-error" role="alert" className="text-sm text-destructive">
                        {loginForm.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••••"
                        {...loginForm.register("password")}
                        aria-invalid={Boolean(loginForm.formState.errors.password)}
                        aria-describedby={loginForm.formState.errors.password ? "login-password-error" : undefined}
                        className={cn(
                          "h-[52px] rounded-[16px] border border-input bg-input/70 pr-16 text-base text-foreground placeholder:text-muted-foreground",
                          loginForm.formState.errors.password && "border-destructive shadow-none"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-primary hover:text-primary/80"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {loginForm.formState.errors.password ? (
                      <p id="login-password-error" role="alert" className="text-sm text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    ) : null}
                  </div>

                  <Button type="submit" className="h-[52px] w-full rounded-[16px] bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90">
                    Log in
                  </Button>
                </form>
              ) : (
                <form className="mt-6 space-y-5" noValidate onSubmit={submitSignup}>
                  {formError ? (
                    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {formError}
                    </p>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="signup-full-name">Full name</Label>
                    <Input
                      id="signup-full-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Ada Obi"
                      {...signupForm.register("full_name")}
                      aria-invalid={Boolean(signupForm.formState.errors.full_name)}
                      aria-describedby={signupForm.formState.errors.full_name ? "signup-full-name-error" : undefined}
                      className={cn(
                        "h-[52px] rounded-[16px] border border-input bg-input/70 text-base text-foreground placeholder:text-muted-foreground",
                        signupForm.formState.errors.full_name && "border-destructive shadow-none"
                      )}
                    />
                    {signupForm.formState.errors.full_name ? (
                      <p id="signup-full-name-error" role="alert" className="text-sm text-destructive">
                        {signupForm.formState.errors.full_name.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...signupForm.register("email")}
                      aria-invalid={Boolean(signupForm.formState.errors.email)}
                      aria-describedby={signupForm.formState.errors.email ? "signup-email-error" : undefined}
                      className={cn(
                        "h-[52px] rounded-[16px] border border-input bg-input/70 text-base text-foreground placeholder:text-muted-foreground",
                        signupForm.formState.errors.email && "border-destructive shadow-none"
                      )}
                    />
                    {signupForm.formState.errors.email ? (
                      <p id="signup-email-error" role="alert" className="text-sm text-destructive">
                        {signupForm.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-organization">Hostel or organization</Label>
                    <Input
                      id="signup-organization"
                      type="text"
                      autoComplete="organization"
                      placeholder="Hostel 2"
                      {...signupForm.register("organization")}
                      aria-invalid={Boolean(signupForm.formState.errors.organization)}
                      aria-describedby={signupForm.formState.errors.organization ? "signup-organization-error" : undefined}
                      className={cn(
                        "h-[52px] rounded-[16px] border border-input bg-input/70 text-base text-foreground placeholder:text-muted-foreground",
                        signupForm.formState.errors.organization && "border-destructive shadow-none"
                      )}
                    />
                    {signupForm.formState.errors.organization ? (
                      <p id="signup-organization-error" role="alert" className="text-sm text-destructive">
                        {signupForm.formState.errors.organization.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        {...signupForm.register("password")}
                        aria-invalid={Boolean(signupForm.formState.errors.password)}
                        aria-describedby={signupForm.formState.errors.password ? "signup-password-error" : undefined}
                        className={cn(
                          "h-[52px] rounded-[16px] border border-input bg-input/70 pr-16 text-base text-foreground placeholder:text-muted-foreground",
                          signupForm.formState.errors.password && "border-destructive shadow-none"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-primary hover:text-primary/80"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {signupForm.formState.errors.password ? (
                      <p id="signup-password-error" role="alert" className="text-sm text-destructive">
                        {signupForm.formState.errors.password.message}
                      </p>
                    ) : null}
                    <p className="text-sm text-muted-foreground">At least 8 characters.</p>
                  </div>

                  <Button type="submit" className="h-[52px] w-full rounded-[16px] bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90">
                    Create account
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "login" ? (
                  <>
                    <span>New here? </span>
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    <span>Already have an account? </span>
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Log in
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
