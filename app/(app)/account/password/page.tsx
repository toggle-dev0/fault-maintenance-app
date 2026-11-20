import Link from "next/link"

import { PasswordChangeForm } from "@/components/auth/password-change-form"
import { changePassword } from "@/app/(app)/account/password/actions"
import { requireUser } from "@/lib/auth/session"

export default async function AccountPasswordPage() {
  const user = await requireUser()

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-[480px] rounded-[28px] border border-border bg-card p-4 shadow-[var(--shadow-floating)] sm:p-6 dark:border-border/80 dark:shadow-none">
        {!user.mustChangePassword ? (
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-[12px] px-3 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Back
          </Link>
        ) : null}

        <h1 className="mt-4 font-heading text-[30px] leading-tight tracking-[-0.04em] text-foreground">
          Change your password
        </h1>

        {user.mustChangePassword ? (
          <p className="mt-3 rounded-[16px] border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground">
            Choose a new password to continue.
          </p>
        ) : null}

        <PasswordChangeForm action={changePassword} />
      </section>
    </main>
  )
}
