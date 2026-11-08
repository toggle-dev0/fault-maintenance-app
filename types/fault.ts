// Allowed values for FixTrack's constrained text columns.
// The database enforces these with check constraints, but generated types only say `string`.
// Keep this file in sync: change it in the same commit as any migration that changes a constraint.

import type { Database } from "./database.types"

export const USER_ROLES = ["user", "technician", "admin"] as const
export const FAULT_CATEGORIES = ["furniture", "electrical", "plumbing", "lift", "other"] as const
export const FAULT_PRIORITIES = ["low", "medium", "critical"] as const
export const FAULT_STATUSES = ["reported", "assigned", "in_progress", "resolved"] as const
export const FAULT_UPDATE_KINDS = ["reported", "assigned", "status_changed", "note"] as const

export type UserRole = (typeof USER_ROLES)[number]
export type FaultCategory = (typeof FAULT_CATEGORIES)[number]
export type FaultPriority = (typeof FAULT_PRIORITIES)[number]
export type FaultStatus = (typeof FAULT_STATUSES)[number]
export type FaultUpdateKind = (typeof FAULT_UPDATE_KINDS)[number]

export const CATEGORY_LABELS: Record<FaultCategory, string> = {
  furniture: "Furniture",
  electrical: "Electrical",
  plumbing: "Plumbing",
  lift: "Lift or elevator",
  other: "Other",
}

export const PRIORITY_LABELS: Record<FaultPriority, string> = {
  low: "Low",
  medium: "Medium",
  critical: "Critical",
}

export const STATUS_LABELS: Record<FaultStatus, string> = {
  reported: "Reported",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
}

// Mirrors the database trigger. The UI uses this to decide which button to show;
// the database still decides what is actually allowed.
export const TECHNICIAN_NEXT_STATUS: Partial<Record<FaultStatus, FaultStatus>> = {
  assigned: "in_progress",
  in_progress: "resolved",
}

type FaultRow = Database["public"]["Tables"]["faults"]["Row"]

// The generated row with the constrained columns narrowed to their real values.
export type Fault = Omit<FaultRow, "category" | "priority" | "status"> & {
  category: FaultCategory
  priority: FaultPriority
  status: FaultStatus
}

const isOneOf = <T extends readonly string[]>(list: T, value: unknown): value is T[number] =>
  typeof value === "string" && (list as readonly string[]).includes(value)

export const isUserRole = (v: unknown): v is UserRole => isOneOf(USER_ROLES, v)
export const isFaultCategory = (v: unknown): v is FaultCategory => isOneOf(FAULT_CATEGORIES, v)
export const isFaultPriority = (v: unknown): v is FaultPriority => isOneOf(FAULT_PRIORITIES, v)
export const isFaultStatus = (v: unknown): v is FaultStatus => isOneOf(FAULT_STATUSES, v)

// Narrow a row from the database. Throws if the database ever returns a value
// this file does not know about, which means the two have drifted apart.
export function toFault(row: FaultRow): Fault {
  if (!isFaultCategory(row.category) || !isFaultPriority(row.priority) || !isFaultStatus(row.status)) {
    throw new Error(`Fault ${row.id} has a value not listed in types/fault.ts`)
  }
  return { ...row, category: row.category, priority: row.priority, status: row.status }
}
