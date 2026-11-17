"use client"

import { useActionState } from "react"

import type {
  ChangePasswordState,
} from "@/app/(auth)/change-password/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ChangePasswordFormProps = {
  action: (
    previousState: ChangePasswordState,
    formData: FormData
  ) => Promise<ChangePasswordState>
}

const initialState: ChangePasswordState = { error: null }

export function ChangePasswordForm({ action }: ChangePasswordFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-[52px] rounded-[16px] bg-input/70"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-[52px] rounded-[16px] bg-input/70"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-[52px] w-full rounded-[16px] text-base font-semibold"
      >
        {isPending ? "Updating password..." : "Update password"}
      </Button>
    </form>
  )
}
