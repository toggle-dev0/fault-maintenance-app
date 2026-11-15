import Link from "next/link"

import { ErrorGeneric } from "@/components/illustrations"

export default function FaultNotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[560px] flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
      <ErrorGeneric aria-hidden="true" className="mb-5 h-36 w-36" />
      <h1 className="font-heading text-[28px] leading-tight tracking-[-0.04em] text-foreground sm:text-[34px]">
        Fault not found
      </h1>
      <p className="mt-3 max-w-[420px] text-sm leading-6 text-muted-foreground sm:text-base">
        This fault doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/faults"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[16px] bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Back to my faults
      </Link>
    </main>
  )
}
