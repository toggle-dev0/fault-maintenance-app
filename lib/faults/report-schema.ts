import { z } from "zod"

import {
  FAULT_CATEGORIES,
  FAULT_PRIORITIES,
} from "@/types/fault"

export const REPORT_FAULT_FAILURE_MESSAGE =
  "Unable to submit the report. Please try again."

export const reportFaultSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Enter at least 3 characters.")
    .max(120, "Use 120 characters or fewer."),
  category: z.enum(FAULT_CATEGORIES),
  building: z
    .string()
    .trim()
    .min(1, "Enter a hostel or building.")
    .max(120, "Use 120 characters or fewer."),
  location_detail: z
    .string()
    .trim()
    .max(200, "Use 200 characters or fewer."),
  priority: z.enum(FAULT_PRIORITIES),
  description: z
    .string()
    .trim()
    .min(1, "Enter a description.")
    .max(2000, "Use 2,000 characters or fewer."),
})

export type ReportFaultValues = z.input<typeof reportFaultSchema>
export type ReportFaultField = keyof ReportFaultValues
export type ReportFaultFieldErrors = Partial<
  Record<ReportFaultField, string>
>

export const REPORT_FAULT_FIELDS = [
  "title",
  "category",
  "building",
  "location_detail",
  "priority",
  "description",
] as const satisfies readonly ReportFaultField[]

export const INITIAL_REPORT_FAULT_VALUES: ReportFaultValues = {
  title: "",
  category: FAULT_CATEGORIES[0],
  building: "",
  location_detail: "",
  priority: FAULT_PRIORITIES[1],
  description: "",
}