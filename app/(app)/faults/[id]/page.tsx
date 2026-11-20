import Link from "next/link"
import { notFound } from "next/navigation"

import {
  FaultDescriptionSection,
  FaultDetailsSection,
  FaultFeedbackSection,
  FaultRepairLogSection,
  StatusChip,
} from "@/components/faults"
import { requireReadyUser } from "@/lib/auth/session"
import { formatFaultRef } from "@/lib/faults"
import { createClient } from "@/lib/supabase/server"
import {
  FAULT_PRIORITIES,
  FAULT_STATUSES,
  isFaultCategory,
  isFaultPriority,
  isFaultStatus,
  PRIORITY_LABELS,
} from "@/types/fault"

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const criticalPriority = FAULT_PRIORITIES[2]
const resolvedStatus = FAULT_STATUSES[3]

export default async function FaultDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ feedback?: string | string[] }>
}) {
  await requireReadyUser()

  const { id } = await params
  const search = await searchParams

  if (!UUID_PATTERN.test(id)) {
    notFound()
  }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  const viewerId = authData?.claims?.sub
  const { data: fault, error: faultError } = await supabase
    .from("faults")
    .select(
      "id, ref_number, title, description, category, building, location_detail, priority, status, created_at, resolved_at, updated_at, reported_by, reporter:profiles!faults_reported_by_fkey(display_name), assigned_technician:profiles!faults_assigned_to_fkey(display_name)"
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

  const { data: feedback, error: feedbackError } = await supabase
    .from("fault_feedback")
    .select("rating, comment, created_at")
    .eq("fault_id", fault.id)
    .maybeSingle()

  if (feedbackError) {
    throw feedbackError
  }

  const canLeaveFeedback =
    fault.status === resolvedStatus &&
    viewerId === fault.reported_by &&
    feedback === null
  const openFeedbackInitially = canLeaveFeedback && search.feedback === "1"

  const { data: updates, error: updatesError } = await supabase
    .from("fault_updates")
    .select(
      "id, kind, note, to_status, created_at, author:profiles!fault_updates_author_id_fkey(display_name), assignee:profiles!fault_updates_assignee_id_fkey(display_name)"
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

  let photoResults: { path: string; signedUrl: string | null }[] = []

  if (photos.length > 0) {
    const { data } = await supabase.storage
      .from("fault-photos")
      .createSignedUrls(
        photos.map((photo) => photo.storage_path),
        3600
      )

    photoResults = photos.map((photo, index) => {
      const signedPhoto = data?.[index]

      return {
        path: photo.storage_path,
        signedUrl:
          signedPhoto?.signedUrl && !signedPhoto.error
            ? signedPhoto.signedUrl
            : null,
      }
    })
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
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

      {search.feedback === "thanks" ? (
        <div
          role="status"
          className="mt-5 flex items-center justify-between gap-4 rounded-[16px] border border-primary bg-primary/5 px-4 py-3 text-sm font-medium text-foreground"
        >
          <span>Thanks for your feedback.</span>
          <Link
            href={`/faults/${fault.id}`}
            aria-label="Dismiss feedback confirmation"
            className="shrink-0 font-semibold text-primary hover:underline"
          >
            Dismiss
          </Link>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        <FaultDescriptionSection
          faultId={fault.id}
          description={fault.description}
          photos={photoResults}
          className="lg:col-start-1 lg:row-start-1"
        />
        <FaultDetailsSection
          category={fault.category}
          building={fault.building}
          locationDetail={fault.location_detail}
          reporterName={fault.reporter?.display_name ?? null}
          createdAt={fault.created_at}
          status={fault.status}
          technicianName={fault.assigned_technician?.display_name ?? null}
          resolvedAt={fault.resolved_at}
          updatedAt={fault.updated_at}
          className="lg:col-start-2 lg:row-start-1"
        />
        <FaultFeedbackSection
          feedback={feedback}
          faultId={fault.id}
          faultTitle={fault.title}
          canLeaveFeedback={canLeaveFeedback}
          initiallyOpen={openFeedbackInitially}
          className="lg:col-start-2 lg:row-start-2"
        />
        <FaultRepairLogSection
          updates={updates}
          className="lg:col-start-1 lg:row-start-2"
        />
      </div>
    </main>
  )
}
