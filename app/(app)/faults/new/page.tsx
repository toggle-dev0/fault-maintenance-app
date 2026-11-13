import Link from "next/link"

import { ReportFaultForm } from "./report-fault-form"

export default function NewFaultPage() {
  return (
    <main className="mx-auto w-full px-4 pb-32 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:max-w-[800px] lg:px-0">
      <Link
        href="/faults"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <span aria-hidden="true">←</span>
        Back to my faults
      </Link>

      <section className="mt-4 w-full bg-background sm:rounded-[24px] sm:border sm:border-border sm:bg-card sm:p-8 sm:shadow-[var(--shadow-floating)] dark:sm:shadow-none lg:mx-auto lg:max-w-[720px] lg:p-10">
        <header className="mb-6 sm:mb-8">
          <h1 className="font-heading text-[30px] leading-tight tracking-[-0.04em] text-foreground sm:text-[32px] lg:text-[34px]">
            Report a fault
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Tell us what is broken and where. An admin will assign a technician.
          </p>
        </header>

        <ReportFaultForm />
      </section>
    </main>
  )
}