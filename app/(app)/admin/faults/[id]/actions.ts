"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { FAULT_PRIORITIES, FAULT_STATUSES, USER_ROLES } from "@/types/fault"

const assignFaultSchema = z.object({
  faultId: z.string().uuid(),
  technicianId: z.string().uuid(),
  priority: z.enum(FAULT_PRIORITIES),
})

type AssignFaultField = "technicianId" | "priority"

export type AssignFaultState = {
  fieldErrors: Partial<Record<AssignFaultField, string>>
  formError: string | null
}

export async function assignFault(
  _previousState: AssignFaultState,
  formData: FormData
): Promise<AssignFaultState> {
  const parsed = assignFaultSchema.safeParse({
    faultId: formData.get("faultId"),
    technicianId: formData.get("technicianId"),
    priority: formData.get("priority"),
  })

  if (!parsed.success) {
    const fieldErrors: AssignFaultState["fieldErrors"] = {}
    let hasFaultIdError = false

    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === "technicianId" && !fieldErrors.technicianId) {
        fieldErrors.technicianId = "Choose a technician."
      } else if (field === "priority" && !fieldErrors.priority) {
        fieldErrors.priority = "Choose a priority."
      } else if (field === "faultId") {
        hasFaultIdError = true
      }
    }

    return {
      fieldErrors,
      formError: hasFaultIdError ? "Unable to save. Please try again." : null,
    }
  }

  const user = await getCurrentUser()
  if (!user || user.mustChangePassword) {
    return {
      fieldErrors: {},
      formError: "You do not have permission to do this.",
    }
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role !== USER_ROLES[2]) {
    return {
      fieldErrors: {},
      formError: "You do not have permission to do this.",
    }
  }

  const { data, error } = await supabase
    .from("faults")
    .update({
      assigned_to: parsed.data.technicianId,
      priority: parsed.data.priority,
    })
    .eq("id", parsed.data.faultId)
    .neq("status", FAULT_STATUSES[3])
    .select("id")
    .single()

  if (error?.code === "23514") {
    return {
      fieldErrors: { technicianId: "Choose a technician." },
      formError: null,
    }
  }

  if (error?.code === "PGRST116" || (!error && !data)) {
    return {
      fieldErrors: {},
      formError: "This fault can no longer be changed.",
    }
  }

  if (error) {
    return {
      fieldErrors: {},
      formError: "Unable to save. Please try again.",
    }
  }

  revalidatePath(`/admin/faults/${parsed.data.faultId}`)
  redirect(`/admin/faults/${parsed.data.faultId}?updated=1`)
}
