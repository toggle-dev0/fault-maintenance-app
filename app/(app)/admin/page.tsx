import Link from "next/link"

import { EmptyUserFaults } from "@/components/illustrations"
import { StatusChip } from "@/components/faults"
import { requireAdmin } from "@/lib/auth/session"
import { formatFaultRef, getRelativeTime } from "@/lib/faults"
import { createClient } from "@/lib/supabase/server"
import {
  FAULT_PRIORITIES,
  FAULT_STATUSES,
  isFaultPriority,
  isFaultStatus,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/types/fault"
import type { FaultPriority, FaultStatus } from "@/types/fault"

const pageSize = 25
const reportedStatus = FAULT_STATUSES[0]
const criticalPriority = FAULT_PRIORITIES[2]

type AdminPageProps = {
  searchParams: Promise<{
    status?: string | string[]
    page?: string | string[]
  }>
}

function parsePage(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return 1
  }

  const page = Number(value)
  return Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1
}

function getPriorityLabel(priority: string): FaultPriority {
  if (!isFaultPriority(priority)) {
    throw new Error(`Fault has an unsupported priority: ${priority}`)
  }

  return priority
}

function getFaultStatus(status: string): FaultStatus {
  if (!isFaultStatus(status)) {
    throw new Error(`Fault has an unsupported status: ${status}`)
  }

  return status
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin()

  const params = await searchParams
  const activeStatus = isFaultStatus(params.status) ? params.status : undefined
  const page = parsePage(params.page)
  const supabase = await createClient()

  let faultQuery = supabase
    .from("faults")
    .select(
      "id, title, ref_number, building, location_detail, priority, status, created_at, assigned_technician:profiles!faults_assigned_to_fkey(display_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (activeStatus) {
    faultQuery = faultQuery.eq("status", activeStatus)
  }

  const [countResults, faultResult] = await Promise.all([
    Promise.all(
      FAULT_STATUSES.map((status) =>
        supabase
          .from("faults")
          .select("id", { count: "exact", head: true })
          .eq("status", status)
      )
    ),
    faultQuery,
  ])

  for (const result of countResults) {
    if (result.error) {
      throw result.error
    }
  }

  if (faultResult.error) {
    throw faultResult.error
  }

  const faults = (faultResult.data ?? []).map((fault) => ({
    ...fault,
    priority: getPriorityLabel(fault.priority),
    status: getFaultStatus(fault.status),
  }))
  const totalCount = faultResult.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  function pageHref(targetPage: number) {
    const query = new URLSearchParams()
    if (activeStatus) {
      query.set("status", activeStatus)
    }
    query.set("page", String(targetPage))
    return `/admin?${query.toString()}`
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-[30px] leading-tight tracking-[-0.04em] text-foreground sm:text-[32px] lg:text-[34px]">
          Faults overview
        </h1>
        {activeStatus ? (
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-[12px] px-3 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Show all faults
          </Link>
        ) : null}
      </div>

      <section
        aria-label="Fault counts by status"
        className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
      >
        {FAULT_STATUSES.map((status, index) => {
          const count = countResults[index]?.count ?? 0

          return (
            <Link
              key={status}
              href={`/admin?status=${status}`}
              aria-current={status === activeStatus ? "true" : undefined}
              aria-label={`${STATUS_LABELS[status]} faults`}
              className="flex min-h-[132px] flex-col items-start justify-between rounded-[24px] border border-border bg-card p-4 shadow-[var(--shadow-floating)] transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5 dark:shadow-none"
            >
              <StatusChip status={status} />
              <span className="font-heading text-[40px] leading-none text-foreground">
                {count}
              </span>
            </Link>
          )
        })}
      </section>

      {faults.length > 0 ? (
        <>
          <div className="mt-6 hidden overflow-hidden rounded-[24px] border border-border bg-card shadow-[var(--shadow-floating)] lg:block dark:shadow-none">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Faults overview</caption>
              <thead>
                <tr className="h-12 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="px-5">
                    Fault
                  </th>
                  <th scope="col" className="px-4">
                    Location
                  </th>
                  <th scope="col" className="px-4">
                    Priority
                  </th>
                  <th scope="col" className="px-4">
                    Status
                  </th>
                  <th scope="col" className="px-4">
                    Technician
                  </th>
                  <th scope="col" className="px-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {faults.map((fault) => (
                  <tr
                    key={fault.id}
                    className="h-[60px] border-t border-border"
                  >
                    <td className="max-w-[260px] px-5">
                      <Link
                        href={`/admin/faults/${fault.id}`}
                        className="block truncate text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {fault.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatFaultRef(fault.ref_number)}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 text-sm text-muted-foreground">
                      {fault.building}
                      {fault.location_detail
                        ? `, ${fault.location_detail}`
                        : ""}
                    </td>
                    <td className="px-4">
                      {fault.priority === criticalPriority ? (
                        <span className="inline-flex h-6 items-center rounded-full bg-status-critical-bg px-2.5 text-xs font-semibold text-status-critical-fg">
                          {PRIORITY_LABELS[fault.priority]}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {PRIORITY_LABELS[fault.priority]}
                        </span>
                      )}
                    </td>
                    <td className="px-4">
                      <StatusChip status={fault.status} />
                    </td>
                    <td className="max-w-[160px] truncate px-4 text-sm text-muted-foreground">
                      {fault.assigned_technician?.display_name ?? "Unassigned"}
                    </td>
                    <td className="px-5 text-right">
                      {fault.status === reportedStatus ? (
                        <Link
                          href={`/admin/faults/${fault.id}`}
                          aria-label={`Assign a technician to ${fault.title}`}
                          className="inline-flex h-10 items-center justify-center rounded-[12px] border border-border px-3 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          Assign
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-5 space-y-3 lg:hidden">
            {faults.map((fault) => (
              <li
                key={fault.id}
                className="rounded-[24px] border border-border bg-card p-4 shadow-[var(--shadow-floating)] sm:p-5 dark:shadow-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 text-base font-semibold text-foreground">
                    <Link
                      href={`/admin/faults/${fault.id}`}
                      className="hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {fault.title}
                    </Link>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {formatFaultRef(fault.ref_number)}
                    </span>
                  </h2>
                  <StatusChip status={fault.status} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {fault.building}
                  {fault.location_detail ? `, ${fault.location_detail}` : ""}
                  {" · "}
                  {getRelativeTime(fault.created_at)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {fault.priority === criticalPriority ? (
                    <span className="inline-flex h-6 items-center rounded-full bg-status-critical-bg px-2.5 text-xs font-semibold text-status-critical-fg">
                      {PRIORITY_LABELS[fault.priority]}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {PRIORITY_LABELS[fault.priority]}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Technician:{" "}
                    {fault.assigned_technician?.display_name ?? "Unassigned"}
                  </span>
                </div>
                {fault.status === reportedStatus ? (
                  <Link
                    href={`/admin/faults/${fault.id}`}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[16px] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Assign technician
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : totalCount === 0 && !activeStatus && page === 1 ? (
        <section className="mt-6 flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-border bg-card px-6 py-10 text-center shadow-[var(--shadow-floating)] dark:shadow-none">
          <EmptyUserFaults aria-hidden="true" className="mb-5 size-40" />
          <h2 className="font-heading text-2xl leading-tight tracking-[-0.03em] text-foreground sm:text-[28px]">
            No faults reported yet
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Reported faults will appear here.
          </p>
        </section>
      ) : (
        <p className="mt-8 rounded-[24px] border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-floating)] dark:shadow-none">
          No faults match this page or filter.
        </p>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Fault pages"
          className="mt-6 flex items-center justify-between gap-4"
        >
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-[12px] border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-[12px] border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  )
}
