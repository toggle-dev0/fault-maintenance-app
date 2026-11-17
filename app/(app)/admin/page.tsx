import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
      <h1 className="font-heading text-[30px] leading-tight tracking-[-0.04em] text-foreground sm:text-[32px] lg:text-[34px]">
        Admin
      </h1>
      <Link
        href="/admin/staff"
        className="mt-6 flex w-full max-w-[560px] items-center justify-between gap-4 rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] transition-colors hover:border-primary/40 sm:p-6 dark:shadow-none"
      >
        <span className="text-base font-semibold text-card-foreground">
          Staff
        </span>
        <ArrowRight aria-hidden="true" className="size-5 text-primary" />
      </Link>
    </main>
  )
}
