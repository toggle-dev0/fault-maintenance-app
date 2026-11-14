"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

import {
  REPORT_FAULT_FIELDS,
  REPORT_FAULT_FAILURE_MESSAGE,
  reportFaultSchema,
  type ReportFaultFieldErrors,
} from "./report-schema"

export type ReportFaultActionResult = {
  fieldErrors?: ReportFaultFieldErrors
  error?: string
  faultId?: string
}

const faultIdSchema = z.string().uuid()

function getFieldValue(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value : ""
}

export async function reportFaultAction(
  formData: FormData,
): Promise<ReportFaultActionResult> {
  const values = {
    title: getFieldValue(formData, "title"),
    category: getFieldValue(formData, "category"),
    building: getFieldValue(formData, "building"),
    location_detail: getFieldValue(formData, "location_detail"),
    priority: getFieldValue(formData, "priority"),
    description: getFieldValue(formData, "description"),
  }
  const parsed = reportFaultSchema.safeParse(values)

  if (!parsed.success) {
    const fieldErrors: ReportFaultFieldErrors = {}

    for (const field of REPORT_FAULT_FIELDS) {
      const issue = parsed.error.issues.find(
        (validationIssue) => validationIssue.path[0] === field,
      )

      if (issue) {
        fieldErrors[field] = issue.message
      }
    }

    return { fieldErrors }
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (!claims) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("faults")
    .insert({
      reported_by: claims.sub,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      building: parsed.data.building,
      location_detail: parsed.data.location_detail || null,
      priority: parsed.data.priority,
    })
    .select("id")
    .single()

  if (error) {
    return { error: REPORT_FAULT_FAILURE_MESSAGE }
  }

  return { faultId: data.id }
}

export async function recordPhotos(
  faultId: string,
  paths: string[]
): Promise<{ success: boolean }> {
  const parsedFaultId = faultIdSchema.safeParse(faultId)

  if (!parsedFaultId.success) {
    return { success: false }
  }

  const pathSchema = z
    .array(
      z
        .string()
        .regex(
          new RegExp(
            `^${parsedFaultId.data}/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\\.jpg$`,
          )
        )
    )
    .max(3)
  const parsedPaths = pathSchema.safeParse(paths)

  if (!parsedPaths.success) {
    return { success: false }
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (!claims) {
    redirect("/login")
  }

  if (parsedPaths.data.length === 0) {
    return { success: true }
  }

  const { error } = await supabase.from("fault_photos").insert(
    parsedPaths.data.map((storage_path) => ({
      fault_id: parsedFaultId.data,
      storage_path,
      uploaded_by: claims.sub,
    })),
  )

  return { success: !error }
}
