"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

import {
  REPORT_FAULT_FIELDS,
  reportFaultSchema,
  type ReportFaultFieldErrors,
} from "./schema"

export type ReportFaultActionResult = {
  fieldErrors?: ReportFaultFieldErrors
  error?: string
}

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
    return { error: "Unable to submit the report. Please try again." }
  }

  redirect(`/faults?new=${data.id}`)
}