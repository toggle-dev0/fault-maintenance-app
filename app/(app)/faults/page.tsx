import Link from "next/link"

import { EmptyUserFaults } from "@/components/illustrations"
import { RepairProgress, StatusChip } from "@/components/faults"
import { requireReadyUser } from "@/lib/auth/session"
import { getRelativeTime } from "@/lib/faults"
import { createClient } from "@/lib/supabase/server"
import { FAULT_STATUSES, isFaultStatus, STATUS_LABELS } from "@/types/fault"
import type { FaultStatus } from "@/types/fault"

const reportedStatus = FAULT_STATUSES[0]
const assignedStatus = FAULT_STATUSES[1]
const inProgressStatus = FAULT_STATUSES[2]
const resolvedStatus = FAULT_STATUSES[3]
const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

const FILTER_OPTIONS = [
  {
    value: "all",
    label: "All",
    matches: () => true,
  },
  {
    value: "open",
    label: "Open",
    matches: (status: FaultStatus) =>
      status === reportedStatus || status === assignedStatus,
  },
  {
    value: inProgressStatus,
    label: STATUS_LABELS[inProgressStatus],
    matches: (status: FaultStatus) => status === inProgressStatus,
  },
  {
    value: resolvedStatus,
    label: STATUS_LABELS[resolvedStatus],
    matches: (status: FaultStatus) => status === resolvedStatus,
  },
] as const

function getAssignmentText(
  status: FaultStatus,
  technicianName: string | null,
) {
  if (status === reportedStatus) {
    return "Awaiting assignment"
  }

  if (status === resolvedStatus) {
    return `Fixed by ${technicianName ?? "Not available"}`
  }

  return `Technician: ${technicianName ?? "Not available"}`
}

export default async function FaultsPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string | string[]
    new?: string | string[]
    photos?: string | string[]
    cleanup?: string | string[]
  }>
}) {
  await requireReadyUser()

  const params = await searchParams
  const requestedFilter = params.filter
  const newFaultId =
    typeof params.new === "string" && UUID_PATTERN.test(params.new)
      ? params.new
      : null
  const photoUploadFailed = newFaultId !== null && params.photos === "failed"
  const photoCleanupFailed =
    photoUploadFailed && params.cleanup === "failed"
  const activeFilter =
    (typeof requestedFilter === "string" &&
      FILTER_OPTIONS.find((option) => option.value === requestedFilter)) ||
    FILTER_OPTIONS[0]

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("faults")
    .select(
      "id, title, building, location_detail, created_at, status, fault_feedback(id), assigned_technician:profiles!faults_assigned_to_fkey(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    throw error
  }

  const faults = data.map((fault) => {
    if (!isFaultStatus(fault.status)) {
      throw new Error(`Fault ${fault.id} has an unsupported status`)
    }

    return { ...fault, status: fault.status }
  })

  const filteredFaults = faults.filter((fault) =>
    activeFilter.matches(fault.status),
  )

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 pb-12 pt-8 sm:px-6 sm:pt-8 lg:px-0 lg:pt-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-[28px] leading-tight tracking-[-0.04em] text-foreground sm:text-[32px] lg:text-[34px]">
            My faults
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Faults you have reported and where each repair stands.
          </p>
        </div>

        <Link
          href="/faults/new"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto"
        >
          <span aria-hidden="true" className="text-xl leading-none">+</span>
          Report a fault
        </Link>
      </div>

      {newFaultId ? (
        <div
          role="status"
          className="mt-5 flex items-center justify-between gap-4 rounded-[16px] border border-primary bg-primary/5 px-4 py-3 text-sm font-medium text-foreground"
        >
          <span>Report submitted.</span>
          {photoUploadFailed ? (
            <span>Some photos could not be uploaded.</span>
          ) : null}
          {photoCleanupFailed ? (
            <span>Some uploaded photo files could not be removed.</span>
          ) : null}
          <Link
            href="/faults"
            aria-label="Dismiss report confirmation"
            className="shrink-0 font-semibold text-primary hover:underline"
          >
            Dismiss
          </Link>
        </div>
      ) : null}

      <nav
        aria-label="Filter faults"
        className="mt-6 max-w-full overflow-x-auto sm:mt-5"
      >
        <div className="inline-flex min-w-max gap-1 rounded-[16px] bg-muted p-1">
          {FILTER_OPTIONS.map((option) => {
            const isActive = option.value === activeFilter.value
            const count = faults.filter((fault) =>
              option.matches(fault.status),
            ).length

            return (
              <Link
                key={option.value}
                href={`/faults?filter=${option.value}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-10 min-w-20 items-center justify-center gap-1 rounded-[12px] px-4 text-sm font-semibold transition-colors sm:h-10 ${
                  isActive
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label} {count}
              </Link>
            )
          })}
        </div>
      </nav>

      {faults.length === 0 ? (
        <section className="mt-5 flex min-h-[460px] flex-col items-center justify-center rounded-[24px] border border-border bg-card px-6 py-10 text-center shadow-[var(--shadow-floating)] dark:shadow-none sm:px-10">
          <EmptyUserFaults
            aria-hidden="true"
            className="mb-5 h-40 w-40"
          />
          <h2 className="font-heading text-2xl leading-tight tracking-[-0.03em] text-foreground sm:text-[28px]">
            No faults reported yet
          </h2>
          <p className="mt-3 max-w-[420px] text-sm leading-6 text-muted-foreground sm:text-base">
            When you report a fault, it will show up here so you can follow the
            repair from start to finish.
          </p>
          <Link
            href="/faults/new"
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto"
          >
            <span aria-hidden="true" className="text-xl leading-none">+</span>
            Report your first fault
          </Link>
        </section>
      ) : filteredFaults.length === 0 ? (
        <p className="mt-10 rounded-[24px] border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground shadow-[var(--shadow-floating)] dark:shadow-none">
          No faults match this filter.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {filteredFaults.map((fault) => {
            const technicianName =
              fault.assigned_technician?.display_name ?? null
            const assignmentText = getAssignmentText(
              fault.status,
              technicianName,
            )

            return (
              <li
                key={fault.id}
                className={`relative flex flex-col gap-4 rounded-[24px] border ${
                  fault.id === newFaultId ? "border-primary" : "border-border"
                } bg-card p-5 shadow-[var(--shadow-floating)] dark:shadow-none sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3 sm:block">
                    <h2 className="min-w-0 text-base font-semibold text-card-foreground">
                      <Link
                        href={`/faults/${fault.id}`}
                        className="after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-[24px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
                      >
                        {fault.title}
                      </Link>
                    </h2>
                    <span className="shrink-0 sm:hidden">
                      <StatusChip status={fault.status} />
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fault.building}
                    {fault.location_detail ? `, ${fault.location_detail}` : ""}{" "}
                    / {getRelativeTime(fault.created_at)}
                  </p>
                  <RepairProgress
                    status={fault.status}
                    className="mt-4"
                  />
                  <p className="mt-3 text-sm text-muted-foreground sm:hidden">
                    {assignmentText}
                  </p>
                  {fault.status === resolvedStatus &&
                  fault.fault_feedback === null ? (
                    <Link
                      href={`/faults/${fault.id}?feedback=1`}
                      className="relative z-10 mt-3 inline-flex h-11 items-center justify-center rounded-[16px] border border-border px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      Leave feedback
                    </Link>
                  ) : null}
                </div>

                <div className="hidden min-w-40 flex-col items-end gap-2 sm:flex">
                  <StatusChip status={fault.status} />
                  <p className="text-right text-sm text-muted-foreground">
                    {assignmentText}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
