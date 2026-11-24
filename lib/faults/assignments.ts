import { createClient } from "@/lib/supabase/server"
import {
  FAULT_STATUSES,
  isFaultPriority,
  isFaultStatus,
} from "@/types/fault"
import type { FaultPriority, FaultStatus } from "@/types/fault"
import { getSevenDaysAgoIso } from "@/lib/faults"

export type AssignmentView = "active" | "todo" | "done"

export type AssignmentFault = {
  id: string
  title: string
  ref_number: number
  building: string
  location_detail: string | null
  priority: FaultPriority
  status: FaultStatus
  created_at: string
  resolved_at: string | null
}

export type AssignmentViewModel = {
  activeView: AssignmentView
  faults: AssignmentFault[]
  assignedCount: number
  inProgressCount: number
  doneCount: number
  activeCount: number
  noAssignmentsAtAll: boolean
  page: number
  totalPages: number
}

const assignedStatus = FAULT_STATUSES[1]
const inProgressStatus = FAULT_STATUSES[2]
const resolvedStatus = FAULT_STATUSES[3]

function normalizeView(value: string | string[] | undefined): AssignmentView {
  if (typeof value !== "string") {
    return "active"
  }

  return value === "todo" || value === "done" ? value : "active"
}

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

export async function loadAssignments(
  technicianId: string,
  requestedView: string | string[] | undefined,
  requestedPage: string | string[] | undefined = undefined,
): Promise<AssignmentViewModel> {
  const activeView = normalizeView(requestedView)
  const supabase = await createClient()
  const sevenDaysAgo = getSevenDaysAgoIso()
  const pageSize = activeView === "done" ? 50 : 100

  const [assignedCountResult, inProgressCountResult, doneCountResult] =
    await Promise.all([
      supabase
        .from("faults")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", technicianId)
        .eq("status", assignedStatus),
      supabase
        .from("faults")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", technicianId)
        .eq("status", inProgressStatus),
      supabase
        .from("faults")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", technicianId)
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
  const viewCount =
    activeView === "todo"
      ? assignedCount
      : activeView === "done"
        ? doneCount
        : assignedCount + inProgressCount
  const totalPages = Math.max(1, Math.ceil(viewCount / pageSize))
  const rawPage =
    typeof requestedPage === "string" && /^\d+$/.test(requestedPage)
      ? Number(requestedPage)
      : 1
  const page =
    Number.isSafeInteger(rawPage) && rawPage >= 1
      ? Math.min(rawPage, totalPages)
      : 1

  const { data, error } = await supabase.rpc("get_technician_assignments", {
    p_view: activeView,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  })
  if (error) {
    throw error
  }

  const faults: AssignmentFault[] = (data ?? []).map((fault) => ({
    ...fault,
    priority: getPriority(fault.priority),
    status: getStatus(fault.status),
  }))

  return {
    activeView,
    faults,
    assignedCount,
    inProgressCount,
    doneCount,
    activeCount: assignedCount + inProgressCount,
    noAssignmentsAtAll:
      assignedCount === 0 && inProgressCount === 0 && doneCount === 0,
    page,
    totalPages,
  }
}
