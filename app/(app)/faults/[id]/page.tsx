import Link from "next/link"
import { notFound } from "next/navigation"

import { StatusChip } from "@/components/faults"
import { formatFaultRef, getRelativeTime } from "@/lib/faults"
import { createClient } from "@/lib/supabase/server"
import {
  CATEGORY_LABELS,
  FAULT_PRIORITIES,
  FAULT_STATUSES,
  FAULT_UPDATE_KINDS,
  isFaultCategory,
  isFaultPriority,
  isFaultStatus,
  isFaultUpdateKind,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/types/fault"

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const reportedKind = FAULT_UPDATE_KINDS[0]
const assignedKind = FAULT_UPDATE_KINDS[1]
const statusChangedKind = FAULT_UPDATE_KINDS[2]
const noteKind = FAULT_UPDATE_KINDS[3]
const criticalPriority = FAULT_PRIORITIES[2]
const resolvedStatus = FAULT_STATUSES[3]

function AbsoluteTime({ dateValue }: { dateValue: string }) {
  return (
    <time dateTime={dateValue} title={new Date(dateValue).toLocaleString()}>
      {getRelativeTime(dateValue)}
    </time>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border py-3 first:border-t-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-semibold text-foreground">
        {children}
      </dd>
    </div>
  )
}

export default async function FaultDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!UUID_PATTERN.test(id)) {
    notFound()
  }

  const supabase = await createClient()
  const { data: fault, error: faultError } = await supabase
    .from("faults")
    .select(
      "id, ref_number, title, description, category, building, location_detail, priority, status, created_at, resolved_at, updated_at, reporter:profiles!faults_reported_by_fkey(display_name), assigned_technician:profiles!faults_assigned_to_fkey(display_name)",
    )
    .eq("id", id)
    .maybeSingle()

  if (faultError) {
    throw faultError
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

  const { data: updates, error: updatesError } = await supabase
    .from("fault_updates")
    .select(
      "id, kind, note, to_status, created_at, author:profiles!fault_updates_author_id_fkey(display_name), assignee:profiles!fault_updates_assignee_id_fkey(display_name)",
    )
    .eq("fault_id", fault.id)
    .order("created_at", { ascending: true })

  if (updatesError) {
    throw updatesError
  }

  const { data: photos, error: photosError } = await supabase
    .from("fault_photos")
    .select("storage_path")
    .eq("fault_id", fault.id)

  if (photosError) {
    throw photosError
  }

  let signedPhotos: { path: string; signedUrl: string }[] = []

  if (photos.length > 0) {
    const { data } = await supabase.storage
      .from("fault-photos")
      .createSignedUrls(
        photos.map((photo) => photo.storage_path),
        3600,
      )

    signedPhotos =
      data?.flatMap((photo) =>
        photo.signedUrl && !photo.error
          ? [{ path: photo.path ?? "", signedUrl: photo.signedUrl }]
          : [],
      ) ?? []
  }

  const location = fault.location_detail
    ? `${fault.building}, ${fault.location_detail}`
    : fault.building

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
      <Link
        href="/faults"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <span aria-hidden="true">←</span>
        Back to my faults
      </Link>

      <header className="mt-5">
        <p className="text-sm font-semibold text-muted-foreground sm:text-base">
          Fault {formatFaultRef(fault.ref_number)}
        </p>
        <h1 className="mt-1 font-heading text-[30px] leading-tight tracking-[-0.04em] text-foreground sm:text-[34px]">
          {fault.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusChip status={fault.status} />
          {fault.priority === criticalPriority ? (
            <span className="inline-flex h-6 items-center rounded-full bg-status-critical-bg px-2.5 text-xs font-semibold text-status-critical-fg">
              {PRIORITY_LABELS[fault.priority]}
            </span>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">
              {PRIORITY_LABELS[fault.priority]} priority
            </span>
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        <section
          aria-labelledby="description-heading"
          className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] dark:shadow-none sm:p-8 lg:col-start-1 lg:row-start-1"
        >
          <h2
            id="description-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Description
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-card-foreground">
            {fault.description}
          </p>
          {signedPhotos.length > 0 ? (
            <div className="mt-5 max-w-full overflow-x-auto">
              <div className="flex w-max gap-3">
                {signedPhotos.map((photo, index) => (
                  <a
                    key={photo.path}
                    href={photo.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open photo ${index + 1} in a new tab`}
                    className="block h-[104px] w-[140px] shrink-0 overflow-hidden rounded-[16px] border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-[120px] sm:w-[168px]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Signed Supabase URLs are displayed at fixed dimensions and loaded lazily. */}
                    <img
                      src={photo.signedUrl}
                      alt={`Photo ${index + 1} of ${signedPhotos.length} for this fault`}
                      width={168}
                      height={120}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section
          aria-labelledby="details-heading"
          className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] dark:shadow-none sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <h2
            id="details-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Details
          </h2>
          <dl className="mt-3 border-b border-border">
            <DetailRow label="Category">
              {CATEGORY_LABELS[fault.category]}
            </DetailRow>
            <DetailRow label="Location">{location}</DetailRow>
            <DetailRow label="Reported by">
              {fault.reporter?.display_name ?? "Maintenance team"}
            </DetailRow>
            <DetailRow label="Reported">
              <AbsoluteTime dateValue={fault.created_at} />
            </DetailRow>
            <DetailRow label="Technician">
              {fault.assigned_technician?.display_name ?? "Not assigned yet"}
            </DetailRow>
            {fault.status === resolvedStatus ? (
              <>
                <DetailRow label="Resolved">
                  <AbsoluteTime
                    dateValue={fault.resolved_at ?? fault.updated_at}
                  />
                </DetailRow>
                <DetailRow label="Fixed by">
                  {fault.assigned_technician?.display_name ??
                    "Maintenance team"}
                </DetailRow>
              </>
            ) : null}
          </dl>
        </section>

        <section
          aria-labelledby="repair-log-heading"
          className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] dark:shadow-none sm:p-8 lg:col-start-1 lg:row-start-2"
        >
          <h2
            id="repair-log-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Repair log
          </h2>
          {updates.length > 0 ? (
            <ol className="mt-5 space-y-5">
              {updates.map((update) => {
                const authorName =
                  update.author?.display_name ?? "Maintenance team"
                let summary = "Repair update"
                let note: string | null = null

                if (isFaultUpdateKind(update.kind)) {
                  if (update.kind === reportedKind) {
                    summary = STATUS_LABELS[FAULT_STATUSES[0]]
                  } else if (update.kind === assignedKind) {
                    summary = `Assigned to ${update.assignee?.display_name ?? "Maintenance team"}`
                  } else if (update.kind === statusChangedKind) {
                    summary = isFaultStatus(update.to_status)
                      ? STATUS_LABELS[update.to_status]
                      : "Status changed"
                  } else if (update.kind === noteKind) {
                    summary = "Repair note"
                    note = update.note
                  }
                }

                return (
                  <li
                    key={update.id}
                    className="relative pl-8 before:absolute before:bottom-[-20px] before:left-[7px] before:top-2 before:w-px before:bg-border last:before:hidden"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 size-4 rounded-full bg-primary"
                    />
                    <p className="font-semibold text-foreground">{summary}</p>
                    <p className="text-sm text-muted-foreground">
                      {authorName},{" "}
                      <AbsoluteTime dateValue={update.created_at} />
                    </p>
                    {note ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-card-foreground">
                        {note}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No repair updates yet.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
