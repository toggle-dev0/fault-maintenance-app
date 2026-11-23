import Link from "next/link"

import { StatusChip } from "@/components/faults"
import { EmptyTechnicianAssignments } from "@/components/illustrations"
import { requireTechnician } from "@/lib/auth/session"
import {
  formatFaultRef,
  getRelativeTime,
  getSevenDaysAgoIso,
} from "@/lib/faults"
import { createClient } from "@/lib/supabase/server"
import {
  FAULT_PRIORITIES,
  FAULT_STATUSES,
  isFaultPriority,
  isFaultStatus,
  PRIORITY_LABELS,
} from "@/types/fault"
import type { FaultPriority, FaultStatus } from "@/types/fault"

type AssignmentView = "active" | "todo" | "done"

type AssignmentsPageProps = {
  searchParams: Promise<{
    view?: string | string[]
  }>
}

const assignedStatus = FAULT_STATUSES[1]
const inProgressStatus = FAULT_STATUSES[2]
const resolvedStatus = FAULT_STATUSES[3]
const criticalPriority = FAULT_PRIORITIES[2]

function getPriority(priority: string): FaultPriority {
  if (!isFaultPriority(priority)) {
    throw new Error(`Fault has an unsupported priority: ${priority}`)
  }
  return priority
}

function getStatus(status: string): FaultStatus {
  if (!isFaultStatus(status)) {
    throw new Error(`Fault has an unsupported status: ${status}`)
  }
  return status
}

export default async function AssignmentsPage({
  searchParams,
}: AssignmentsPageProps) {
  const user = await requireTechnician()
  const params = await searchParams
  const requestedView = typeof params.view === "string" ? params.view : "active"
  const activeView: AssignmentView =
    requestedView === "todo" || requestedView === "done"
      ? requestedView
      : "active"

  const supabase = await createClient()
  const sevenDaysAgo = getSevenDaysAgoIso()

  const [assignedCountResult, inProgressCountResult, doneCountResult] =
    await Promise.all([
      supabase
        .from("faults")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .eq("status", assignedStatus),
      supabase
        .from("faults")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .eq("status", inProgressStatus),
      supabase
        .from("faults")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .eq("status", resolvedStatus)
        .gte("resolved_at", sevenDaysAgo),
    ])

  for (const result of [
    assignedCountResult,
    inProgressCountResult,
    doneCountResult,
  ]) {
    if (result.error) {
      throw result.error
    }
  }

  const assignedCount = assignedCountResult.count ?? 0
  const inProgressCount = inProgressCountResult.count ?? 0
  const doneCount = doneCountResult.count ?? 0
  const activeCount = assignedCount + inProgressCount

  let faultQuery
  if (activeView === "todo") {
    faultQuery = supabase
      .from("faults")
      .select(
        "id, title, ref_number, building, location_detail, priority, status, created_at, resolved_at",
      )
      .eq("assigned_to", user.id)
      .eq("status", assignedStatus)
      .limit(100)
  } else if (activeView === "done") {
    faultQuery = supabase
      .from("faults")
      .select(
        "id, title, ref_number, building, location_detail, priority, status, created_at, resolved_at",
      )
      .eq("assigned_to", user.id)
      .eq("status", resolvedStatus)
      .order("resolved_at", { ascending: false })
      .limit(50)
  } else {
    faultQuery = supabase
      .from("faults")
      .select(
        "id, title, ref_number, building, location_detail, priority, status, created_at, resolved_at",
      )
      .eq("assigned_to", user.id)
      .in("status", [assignedStatus, inProgressStatus])
      .limit(100)
  }

  const { data, error } = await faultQuery
  if (error) {
    throw error
  }

  const faults = (data ?? []).map((fault) => ({
    ...fault,
    priority: getPriority(fault.priority),
    status: getStatus(fault.status),
  }))

  if (activeView === "active" || activeView === "todo") {
    faults.sort((left, right) => {
      const leftPriorityRank = FAULT_PRIORITIES.indexOf(left.priority)
      const rightPriorityRank = FAULT_PRIORITIES.indexOf(right.priority)

      if (leftPriorityRank !== rightPriorityRank) {
        return rightPriorityRank - leftPriorityRank
      }

      return (
        new Date(left.created_at).getTime() -
        new Date(right.created_at).getTime()
      )
    })
  }

  const tabs = [
    { value: "active" as const, label: "Active", count: activeCount },
    { value: "todo" as const, label: "To do", count: assignedCount },
    { value: "done" as const, label: "Done", count: doneCount },
  ]

  const noAssignmentsAtAll =
    assignedCount === 0 && inProgressCount === 0 && doneCount === 0

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 pb-12 pt-8 sm:px-6 sm:pt-8 lg:px-0 lg:pt-10">
      <div>
        <h1 className="font-heading text-[28px] leading-tight tracking-[-0.04em] text-foreground sm:text-[32px] lg:text-[34px]">
          My assignments
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Faults assigned to you, most urgent first.
        </p>
      </div>

      <section
        aria-label="Assignment counts"
        className="mt-6 grid grid-cols-3 gap-2 sm:gap-4"
      >
        {[assignedStatus, inProgressStatus, resolvedStatus].map((status) => {
          const count =
            status === assignedStatus
              ? assignedCount
              : status === inProgressStatus
                ? inProgressCount
                : doneCount

          return (
            <div
              key={status}
              className="flex min-h-[112px] flex-col items-start justify-between rounded-[24px] border border-border bg-card p-3 shadow-[var(--shadow-floating)] sm:min-h-[128px] sm:p-5 dark:shadow-none"
            >
              <StatusChip status={status} />
              <span className="font-heading text-[32px] leading-none text-foreground sm:text-[40px]">
                {count}
              </span>
            </div>
          )
        })}
      </section>

      <nav
        aria-label="Assignment views"
        className="mt-6 max-w-full overflow-x-auto sm:mt-5"
      >
        <div className="inline-flex min-w-max gap-1 rounded-[16px] bg-muted p-1">
          {tabs.map((tab) => {
            const isActive = tab.value === activeView
            return (
              <Link
                key={tab.value}
                href={`/assignments?view=${tab.value}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-11 min-w-20 items-center justify-center gap-1 rounded-[12px] px-4 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label} {tab.count}
              </Link>
            )
          })}
        </div>
      </nav>

      {noAssignmentsAtAll ? (
        <section className="mt-5 flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-border bg-card px-6 py-10 text-center shadow-[var(--shadow-floating)] dark:shadow-none">
          <EmptyTechnicianAssignments
            aria-hidden="true"
            className="mb-5 size-40"
          />
          <h2 className="font-heading text-2xl leading-tight tracking-[-0.03em] text-foreground sm:text-[28px]">
            Nothing assigned right now
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            New assignments will appear here.
          </p>
        </section>
      ) : faults.length === 0 ? (
        <p className="mt-8 rounded-[24px] border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-floating)] dark:shadow-none">
          No assignments match this view.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {faults.map((fault) => {
            const isResolved = fault.status === resolvedStatus
            const isCritical = fault.priority === criticalPriority
            const timeLabel = isResolved
              ? `Resolved ${getRelativeTime(fault.resolved_at ?? fault.created_at)}`
              : `Reported ${getRelativeTime(fault.created_at)}`

            return (
              <li
                key={fault.id}
                className={`flex flex-col gap-4 rounded-[24px] border bg-card p-4 shadow-[var(--shadow-floating)] dark:shadow-none sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                  isCritical
                    ? "border-destructive"
                    : "border-border"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-card-foreground">
                        <Link
                          href={`/assignments/${fault.id}`}
                          className="hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          {fault.title}
                        </Link>
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatFaultRef(fault.ref_number)}
                      </p>
                    </div>
                    <span className="shrink-0 sm:hidden">
                      <StatusChip status={fault.status} />
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {fault.building}
                    {fault.location_detail ? `, ${fault.location_detail}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {timeLabel}
                  </p>

                  {isCritical ? (
                    <span className="mt-3 inline-flex h-6 items-center rounded-full bg-status-critical-bg px-2.5 text-xs font-semibold text-status-critical-fg sm:mt-2">
                      {PRIORITY_LABELS[fault.priority]}
                    </span>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground sm:mt-2">
                      {PRIORITY_LABELS[fault.priority]} priority
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span className="hidden sm:block">
                    <StatusChip status={fault.status} />
                  </span>
                  <Link
                    href={`/assignments/${fault.id}`}
                    aria-label={
                      isResolved
                        ? `View ${fault.title}`
                        : `Update repair for ${fault.title}`
                    }
                    className={
                      isResolved
                        ? "inline-flex h-11 w-full items-center justify-center rounded-[16px] border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto lg:h-10"
                        : "inline-flex h-11 w-full items-center justify-center rounded-[16px] bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-auto lg:h-10"
                    }
                  >
                    {isResolved ? "View" : "Update repair"}
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
