"use client"

import { useActionState } from "react"
import Link from "next/link"

import {
  assignFault,
  type AssignFaultState,
} from "@/app/(app)/admin/faults/[id]/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  FAULT_PRIORITIES,
  FAULT_STATUSES,
  PRIORITY_LABELS,
} from "@/types/fault"
import type { FaultPriority, FaultStatus } from "@/types/fault"

type Technician = {
  id: string
  display_name: string | null
  organization: string | null
}

type FaultAssignmentPanelProps = {
  faultId: string
  status: FaultStatus
  priority: FaultPriority
  assignedTechnicianId: string | null
  technicians: Technician[]
  className?: string
}

const initialState: AssignFaultState = {
  fieldErrors: {},
  formError: null,
}

export function FaultAssignmentPanel({
  faultId,
  status,
  priority,
  assignedTechnicianId,
  technicians,
  className,
}: FaultAssignmentPanelProps) {
  const [state, formAction, pending] = useActionState(assignFault, initialState)
  const isReported = status === FAULT_STATUSES[0]

  return (
    <section
      className={cn(
        "rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-floating)] sm:p-6 dark:shadow-none",
        className
      )}
    >
      <h2 className="font-heading text-2xl leading-tight tracking-[-0.03em] text-foreground sm:text-[28px]">
        {isReported ? "Assign technician" : "Reassign technician"}
      </h2>

      {technicians.length > 0 ? (
        <form action={formAction} className="mt-5 space-y-5">
          <input type="hidden" name="faultId" value={faultId} />

          {state.formError ? (
            <p
              role="alert"
              className="rounded-[12px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.formError}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="technicianId">Technician</Label>
            <select
              id="technicianId"
              name="technicianId"
              required
              defaultValue={assignedTechnicianId ?? ""}
              aria-invalid={Boolean(state.fieldErrors.technicianId)}
              aria-describedby={
                state.fieldErrors.technicianId
                  ? "technicianId-error"
                  : undefined
              }
              className="h-12 w-full rounded-[16px] border border-input bg-input/70 px-4 text-base text-foreground"
            >
              {assignedTechnicianId ? null : (
                <option value="" disabled>
                  Choose a technician
                </option>
              )}
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.display_name ?? "Unnamed technician"}
                  {technician.organization
                    ? ` (${technician.organization})`
                    : ""}
                </option>
              ))}
            </select>
            {state.fieldErrors.technicianId ? (
              <p
                id="technicianId-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {state.fieldErrors.technicianId}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              name="priority"
              required
              defaultValue={priority}
              aria-invalid={Boolean(state.fieldErrors.priority)}
              aria-describedby={
                state.fieldErrors.priority ? "priority-error" : undefined
              }
              className="h-12 w-full rounded-[16px] border border-input bg-input/70 px-4 text-base text-foreground"
            >
              {FAULT_PRIORITIES.map((option) => (
                <option key={option} value={option}>
                  {PRIORITY_LABELS[option]}
                </option>
              ))}
            </select>
            {state.fieldErrors.priority ? (
              <p
                id="priority-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {state.fieldErrors.priority}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-[16px] px-6 text-base font-semibold"
          >
            {isReported ? "Assign technician" : "Save changes"}
          </Button>
        </form>
      ) : (
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-muted-foreground">No technicians yet.</p>
          <Link
            href="/admin/staff"
            className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline"
          >
            Add one on the Staff page
          </Link>
        </div>
      )}
    </section>
  )
}
