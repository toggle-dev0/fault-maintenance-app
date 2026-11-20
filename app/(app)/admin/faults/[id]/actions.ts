"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { requireAdmin } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { USER_ROLES } from "@/types/fault"

const assignmentSchema = z.object({
  faultId: z.string().uuid(),
  technicianId: z.string().uuid(),
})

export async function assignTechnician(formData: FormData) {
  await requireAdmin()

  const parsed = assignmentSchema.safeParse({
    faultId: formData.get("faultId"),
    technicianId: formData.get("technicianId"),
  })

  if (!parsed.success) {
    const faultId = formData.get("faultId")
    redirect(
      typeof faultId === "string" &&
        /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(faultId)
        ? `/admin/faults/${faultId}?error=assignment`
        : "/admin"
    )
  }

  const supabase = await createClient()
  const { data: technician, error: technicianError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", parsed.data.technicianId)
    .eq("role", USER_ROLES[1])
    .maybeSingle()

  if (technicianError || !technician) {
    redirect(`/admin/faults/${parsed.data.faultId}?error=assignment`)
  }

  const { data: updated, error } = await supabase
    .from("faults")
    .update({ assigned_to: parsed.data.technicianId })
    .eq("id", parsed.data.faultId)
    .eq("status", "reported")
    .select("id")
    .maybeSingle()

  if (error || !updated) {
    redirect(`/admin/faults/${parsed.data.faultId}?error=assignment`)
  }

  revalidatePath("/admin")
  revalidatePath(`/admin/faults/${parsed.data.faultId}`)
  redirect(`/admin/faults/${parsed.data.faultId}?assigned=1`)
}
