import { Star } from "lucide-react"

import { FeedbackDialog } from "@/components/faults/feedback-dialog"
import FaultPhotos from "@/components/faults/fault-photos"
import { getRelativeTime } from "@/lib/faults"
import { cn } from "@/lib/utils"
import {
  CATEGORY_LABELS,
  FAULT_STATUSES,
  FAULT_UPDATE_KINDS,
  isFaultStatus,
  isFaultUpdateKind,
  STATUS_LABELS,
  type FaultCategory,
  type FaultStatus,
} from "@/types/fault"

type Photo = {
  path: string
  signedUrl: string | null
}

type FaultUpdate = {
  id: string
  kind: string
  note: string | null
  to_status: string | null
  created_at: string
  author: { display_name: string | null } | null
  assignee: { display_name: string | null } | null
}

type Feedback = {
  rating: number
  comment: string | null
  created_at: string
}

type SectionProps = {
  className?: string
}

type FaultDetailsProps = SectionProps & {
  category: FaultCategory
  building: string
  locationDetail: string | null
  reporterName: string | null
  createdAt: string
  status: FaultStatus
  technicianName: string | null
  resolvedAt: string | null
  updatedAt: string
}

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

export function FaultDescriptionSection({
  faultId,
  description,
  photos,
  className,
}: SectionProps & {
  faultId: string
  description: string
  photos: Photo[]
}) {
  return (
    <section
      aria-labelledby="description-heading"
      className={cn(
        "rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] sm:p-8 dark:shadow-none",
        className
      )}
    >
      <h2
        id="description-heading"
        className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
      >
        Description
      </h2>
      <p className="mt-4 text-base leading-7 whitespace-pre-wrap text-card-foreground">
        {description}
      </p>
      {photos.length > 0 ? (
        <FaultPhotos faultId={faultId} photos={photos} />
      ) : null}
    </section>
  )
}

export function FaultDetailsSection({
  category,
  building,
  locationDetail,
  reporterName,
  createdAt,
  status,
  technicianName,
  resolvedAt,
  updatedAt,
  className,
}: FaultDetailsProps) {
  const location = locationDetail ? `${building}, ${locationDetail}` : building
  const resolvedStatus = FAULT_STATUSES[3]

  return (
    <section
      aria-labelledby="details-heading"
      className={cn(
        "rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] sm:p-8 dark:shadow-none",
        className
      )}
    >
      <h2
        id="details-heading"
        className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
      >
        Details
      </h2>
      <dl className="mt-3 border-b border-border">
        <DetailRow label="Category">{CATEGORY_LABELS[category]}</DetailRow>
        <DetailRow label="Location">{location}</DetailRow>
        <DetailRow label="Reported by">
          {reporterName ?? "Maintenance team"}
        </DetailRow>
        <DetailRow label="Reported">
          <AbsoluteTime dateValue={createdAt} />
        </DetailRow>
        <DetailRow label="Technician">
          {technicianName ?? "Not assigned yet"}
        </DetailRow>
        {status === resolvedStatus ? (
          <>
            <DetailRow label="Resolved">
              <AbsoluteTime dateValue={resolvedAt ?? updatedAt} />
            </DetailRow>
            <DetailRow label="Fixed by">
              {technicianName ?? "Maintenance team"}
            </DetailRow>
          </>
        ) : null}
      </dl>
    </section>
  )
}

export function FaultFeedbackSection({
  feedback,
  faultId,
  faultTitle,
  canLeaveFeedback,
  initiallyOpen,
  className,
}: SectionProps & {
  feedback: Feedback | null
  faultId: string
  faultTitle: string
  canLeaveFeedback: boolean
  initiallyOpen: boolean
}) {
  if (canLeaveFeedback) {
    return (
      <section
        aria-labelledby="repair-complete-heading"
        className={cn(
          "rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] sm:p-8 dark:shadow-none",
          className
        )}
      >
        <h2
          id="repair-complete-heading"
          className="font-heading text-[28px] leading-tight tracking-[-0.04em] text-foreground"
        >
          Repair complete
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tell us how the repair went. It helps the team improve.
        </p>
        <div className="mt-5">
          <FeedbackDialog
            faultId={faultId}
            faultTitle={faultTitle}
            initiallyOpen={initiallyOpen}
          />
        </div>
      </section>
    )
  }

  if (!feedback) {
    return null
  }

  return (
    <section
      aria-labelledby="feedback-heading"
      className={cn(
        "rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] sm:p-8 dark:shadow-none",
        className
      )}
    >
      <h2
        id="feedback-heading"
        className="font-heading text-[28px] leading-tight tracking-[-0.04em] text-foreground"
      >
        Feedback
      </h2>
      <p className="mt-3 font-semibold text-foreground">
        Rated {feedback.rating} out of 5
      </p>
      <div aria-hidden="true" className="mt-2 flex items-center gap-1">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={
              index < feedback.rating
                ? "size-5 fill-primary text-primary"
                : "size-5 fill-transparent text-muted-foreground"
            }
          />
        ))}
      </div>
      {feedback.comment ? (
        <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-card-foreground">
          {feedback.comment}
        </p>
      ) : null}
    </section>
  )
}

export function FaultRepairLogSection({
  updates,
  className,
}: SectionProps & { updates: FaultUpdate[] }) {
  const reportedKind = FAULT_UPDATE_KINDS[0]
  const assignedKind = FAULT_UPDATE_KINDS[1]
  const statusChangedKind = FAULT_UPDATE_KINDS[2]
  const noteKind = FAULT_UPDATE_KINDS[3]

  return (
    <section
      aria-labelledby="repair-log-heading"
      className={cn(
        "rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] sm:p-8 dark:shadow-none",
        className
      )}
    >
      <h2
        id="repair-log-heading"
        className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
      >
        Repair log
      </h2>
      {updates.length > 0 ? (
        <ol className="mt-5 space-y-5">
          {updates.map((update) => {
            const authorName = update.author?.display_name ?? "Maintenance team"
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
                className="relative pl-8 before:absolute before:top-2 before:bottom-[-20px] before:left-[7px] before:w-px before:bg-border last:before:hidden"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 left-0 size-4 rounded-full bg-primary"
                />
                <p className="font-semibold text-foreground">{summary}</p>
                <p className="text-sm text-muted-foreground">
                  {authorName}, <AbsoluteTime dateValue={update.created_at} />
                </p>
                {note ? (
                  <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-card-foreground">
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
  )
}
