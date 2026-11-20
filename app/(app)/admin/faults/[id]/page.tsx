import Link from "next/link"
import { notFound } from "next/navigation"

import { assignTechnician } from "./actions"
import { StatusChip } from "@/components/faults"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { requireAdmin } from "@/lib/auth/session"
import { formatFaultRef, getRelativeTime } from "@/lib/faults"
import { createClient } from "@/lib/supabase/server"
import {
  CATEGORY_LABELS,
  isFaultCategory,
  isFaultPriority,
  isFaultStatus,
  PRIORITY_LABELS,
  USER_ROLES,
} from "@/types/fault"

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

export default async function AdminFaultDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    assigned?: string | string[]
    error?: string | string[]
  }>
}) {
  await requireAdmin()

  const { id } = await params
  const search = await searchParams

  if (!UUID_PATTERN.test(id)) {
    notFound()
  }

  const supabase = await createClient()
  const { data: fault, error } = await supabase
    .from("faults")
    .select(
      "id, ref_number, title, description, category, building, location_detail, priority, status, created_at, assigned_technician:profiles!faults_assigned_to_fkey(id, display_name)"
    )
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!fault) {
    notFound()
  }

  if (
    !isFaultCategory(fault.category) ||
    !isFaultPriority(fault.priority) ||
    !isFaultStatus(fault.status)
  ) {
    throw new Error(`Fault ${fault.id} has an unsupported value`)
  }

  const { data: technicians, error: techniciansError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", USER_ROLES[1])
    .order("display_name", { ascending: true })

  if (techniciansError) {
    throw techniciansError
  }

  const location = fault.location_detail
    ? `${fault.building}, ${fault.location_detail}`
    : fault.building

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
      >
        ← Back to faults
      </Link>

      {search.assigned === "1" ? (
        <p
          role="status"
          className="mt-4 rounded-[16px] border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground"
        >
          Technician assigned successfully.
        </p>
      ) : null}
      {search.error === "assignment" ? (
        <p
          role="alert"
          className="mt-4 rounded-[16px] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          Unable to assign this technician. Please try again.
        </p>
      ) : null}

      <header className="mt-5">
        <p className="text-sm font-semibold text-muted-foreground">
          Fault {formatFaultRef(fault.ref_number)}
        </p>
        <h1 className="mt-1 font-heading text-[30px] leading-tight tracking-[-0.04em] text-foreground sm:text-[34px]">
          {fault.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusChip status={fault.status} />
          <span className="text-sm font-semibold text-muted-foreground">
            {PRIORITY_LABELS[fault.priority]} priority
          </span>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] sm:p-8 dark:shadow-none">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Description
          </h2>
          <p className="mt-4 text-base leading-7 whitespace-pre-wrap text-card-foreground">
            {fault.description}
          </p>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] sm:p-6 dark:shadow-none">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Details
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="text-right font-semibold text-foreground">
                  {CATEGORY_LABELS[fault.category]}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="text-right font-semibold text-foreground">
                  {location}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Technician</dt>
                <dd className="text-right font-semibold text-foreground">
                  {fault.assigned_technician?.display_name ?? "Unassigned"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Reported</dt>
                <dd className="text-right font-semibold text-foreground">
                  {getRelativeTime(fault.created_at)}
                </dd>
              </div>
            </dl>
          </section>

          {fault.status === "reported" ? (
            <section className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] sm:p-6 dark:shadow-none">
              <h2 className="text-base font-semibold text-card-foreground">
                Assign technician
              </h2>
              {technicians.length > 0 ? (
                <form action={assignTechnician} className="mt-4 space-y-4">
                  <input type="hidden" name="faultId" value={fault.id} />
                  <div className="space-y-2">
                    <Label htmlFor="technicianId">Technician</Label>
                    <select
                      id="technicianId"
                      name="technicianId"
                      required
                      className="h-12 w-full rounded-[16px] border border-input bg-input/70 px-4 text-base text-foreground"
                    >
                      <option value="">Select a technician</option>
                      {technicians.map((technician) => (
                        <option key={technician.id} value={technician.id}>
                          {technician.display_name ?? "Unnamed technician"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-[16px] px-4 text-sm font-semibold"
                  >
                    Assign
                  </Button>
                </form>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No technician accounts available.
                </p>
              )}
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  )
}
