"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"

import type { ChangePasswordResult } from "@/lib/auth/password-schema"
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/lib/auth/password-schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type PasswordChangeFormProps = {
  action: (formData: FormData) => Promise<ChangePasswordResult>
}

export function PasswordChangeForm({ action }: PasswordChangeFormProps) {
  const [formError, setFormError] = useState("")
  const [isSuccessful, setIsSuccessful] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const submit = form.handleSubmit((values) => {
    setFormError("")
    setIsSuccessful(false)
    form.clearErrors()

    const formData = new FormData()
    formData.set("currentPassword", values.currentPassword)
    formData.set("newPassword", values.newPassword)
    formData.set("confirmPassword", values.confirmPassword)

    startTransition(async () => {
      const result = await action(formData)

      for (const field of [
        "currentPassword",
        "newPassword",
        "confirmPassword",
      ] as const) {
        const message = result.fieldErrors?.[field]

        if (message) {
          form.setError(field, { type: "server", message })
        }
      }

      if (result.error) {
        setFormError(result.error)
      }

      if (result.success) {
        form.reset()
        setIsSuccessful(true)
      }
    })
  })

  return (
    <form className="mt-6 space-y-5" noValidate onSubmit={submit}>
      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      ) : null}

      {isSuccessful ? (
        <p role="status" className="text-sm font-medium text-primary">
          Password updated.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="current-password">Current password</Label>
        <div className="relative">
          <Input
            id="current-password"
            type={showCurrentPassword ? "text" : "password"}
            autoComplete="current-password"
            maxLength={72}
            {...form.register("currentPassword")}
            aria-invalid={Boolean(form.formState.errors.currentPassword)}
            aria-describedby={
              form.formState.errors.currentPassword
                ? "current-password-error"
                : undefined
            }
            className={cn(
              "h-[52px] rounded-[16px] border border-input bg-input/70 pr-16 text-base text-foreground",
              form.formState.errors.currentPassword &&
                "border-destructive shadow-none"
            )}
          />
          <button
            type="button"
            aria-label={`${showCurrentPassword ? "Hide" : "Show"} current password`}
            onClick={() => setShowCurrentPassword((visible) => !visible)}
            className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-primary hover:text-primary/80"
          >
            {showCurrentPassword ? "Hide" : "Show"}
          </button>
        </div>
        {form.formState.errors.currentPassword ? (
          <p
            id="current-password-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {form.formState.errors.currentPassword.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            maxLength={72}
            {...form.register("newPassword")}
            aria-invalid={Boolean(form.formState.errors.newPassword)}
            aria-describedby={
              form.formState.errors.newPassword
                ? "new-password-hint new-password-error"
                : "new-password-hint"
            }
            className={cn(
              "h-[52px] rounded-[16px] border border-input bg-input/70 pr-16 text-base text-foreground",
              form.formState.errors.newPassword &&
                "border-destructive shadow-none"
            )}
          />
          <button
            type="button"
            aria-label={`${showNewPassword ? "Hide" : "Show"} new password`}
            onClick={() => setShowNewPassword((visible) => !visible)}
            className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-primary hover:text-primary/80"
          >
            {showNewPassword ? "Hide" : "Show"}
          </button>
        </div>
        <p id="new-password-hint" className="text-sm text-muted-foreground">
          At least 12 characters.
        </p>
        {form.formState.errors.newPassword ? (
          <p
            id="new-password-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {form.formState.errors.newPassword.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            maxLength={72}
            {...form.register("confirmPassword")}
            aria-invalid={Boolean(form.formState.errors.confirmPassword)}
            aria-describedby={
              form.formState.errors.confirmPassword
                ? "confirm-password-error"
                : undefined
            }
            className={cn(
              "h-[52px] rounded-[16px] border border-input bg-input/70 pr-16 text-base text-foreground",
              form.formState.errors.confirmPassword &&
                "border-destructive shadow-none"
            )}
          />
          <button
            type="button"
            aria-label={`${showConfirmPassword ? "Hide" : "Show"} confirmation password`}
            onClick={() => setShowConfirmPassword((visible) => !visible)}
            className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-primary hover:text-primary/80"
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>
        {form.formState.errors.confirmPassword ? (
          <p
            id="confirm-password-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {form.formState.errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-[52px] w-full rounded-[16px] bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {isPending ? "Updating password..." : "Update password"}
      </Button>
    </form>
  )
}
