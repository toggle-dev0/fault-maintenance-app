import { FAULT_STATUSES, STATUS_LABELS } from "@/types/fault"
import type { FaultStatus } from "@/types/fault"

const reportedStatus = FAULT_STATUSES[0]
const assignedStatus = FAULT_STATUSES[1]
const inProgressStatus = FAULT_STATUSES[2]
const resolvedStatus = FAULT_STATUSES[3]

const STATUS_CLASSES: Record<FaultStatus, string> = {
  [reportedStatus]: "bg-status-reported-bg text-status-reported-fg",
  [assignedStatus]: "bg-status-assigned-bg text-status-assigned-fg",
  [inProgressStatus]: "bg-status-progress-bg text-status-progress-fg",
  [resolvedStatus]: "bg-status-resolved-bg text-status-resolved-fg",
}

export function StatusChip({ status }: { status: FaultStatus }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${STATUS_CLASSES[status]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  )
}
