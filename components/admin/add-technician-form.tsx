"use client"

import { useRef, useState, useTransition, type FormEvent } from "react"

import {
  createTechnician,
  type TechnicianActionResult,
  type TechnicianFormField,
} from "@/app/(app)/admin/staff/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialResult: TechnicianActionResult = {
  fieldErrors: {},
  formError: null,
  account: null,
}

const fieldLabels: Record<TechnicianFormField, string> = {
  full_name: "Full name",
  email: "Email",
  organization: "Hostel or organization",
}

export default function AddTechnicianForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [result, setResult] = useState(initialResult)
  const [copyMessage, setCopyMessage] = useState("")
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setResult(initialResult)
    setCopyMessage("")

    startTransition(async () => {
      let actionResult: TechnicianActionResult

      try {
        actionResult = await createTechnician(formData)
      } catch {
        actionResult = {
          fieldErrors: {},
          formError: "Unable to create the account. Please try again.",
          account: null,
        }
      }

      setResult(actionResult)
      if (actionResult.account) {
        formRef.current?.reset()
      }
    })
  }

  async function copyPassword() {
    const password = result.account?.password
    if (!password) {
      return
    }

    try {
      await navigator.clipboard.writeText(password)
      setCopyMessage("Copied")
    } catch {
      setCopyMessage("Unable to copy. Select and copy the password.")
    }
  }

  function clearAccount() {
    setResult(initialResult)
    setCopyMessage("")
  }

  return (
    <section className="w-full rounded-[24px] border border-border bg-card p-4 shadow-[var(--shadow-floating)] sm:p-6 lg:max-w-[560px] dark:shadow-none">
      <h2 className="font-heading text-2xl leading-tight tracking-[-0.03em] text-foreground">
        Add a technician
      </h2>

      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        className="mt-5 space-y-5"
      >
        {result.formError ? (
          <p
            role="alert"
            className="rounded-[12px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {result.formError}
          </p>
        ) : null}

        {(Object.keys(fieldLabels) as TechnicianFormField[]).map((field) => {
          const error = result.fieldErrors[field]
          const id = `technician-${field}`
          const type = field === "email" ? "email" : "text"
          const maxLength =
            field === "full_name" ? 100 : field === "email" ? 254 : 120

          return (
            <div key={field} className="space-y-2">
              <Label htmlFor={id}>{fieldLabels[field]}</Label>
              <Input
                id={id}
                name={field}
                type={type}
                autoComplete={
                  field === "full_name"
                    ? "name"
                    : field === "email"
                      ? "email"
                      : "organization"
                }
                required={field !== "organization"}
                maxLength={maxLength}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                className="h-12 rounded-[16px] border border-input bg-input/70 px-4 text-base text-foreground"
              />
              {error ? (
                <p
                  id={`${id}-error`}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}
            </div>
          )
        })}

        <Button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-[16px] px-6 text-base font-semibold sm:w-auto"
        >
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      {result.account ? (
        <div
          role="status"
          className="mt-6 rounded-[16px] border border-primary/30 bg-primary/5 p-4 text-foreground sm:p-5"
        >
          <h3 className="text-base font-semibold">Account created</h3>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1 font-medium break-all">
                {result.account.email}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Password</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-3">
                <code className="font-mono break-all text-foreground">
                  {result.account.password}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyPassword}
                  className="h-11 rounded-[12px] px-3"
                >
                  Copy password
                </Button>
              </dd>
              <p
                aria-live="polite"
                className="mt-2 text-sm text-muted-foreground"
              >
                {copyMessage}
              </p>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Share this password securely. It is shown only once. The technician
            will be asked to change it at first log-in.
          </p>
          <Button
            type="button"
            onClick={clearAccount}
            className="mt-5 h-11 w-full rounded-[16px] sm:w-auto"
          >
            Done
          </Button>
        </div>
      ) : null}
    </section>
  )
}
