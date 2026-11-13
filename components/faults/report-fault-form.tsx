"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  CATEGORY_LABELS,
  FAULT_CATEGORIES,
  FAULT_PRIORITIES,
  PRIORITY_LABELS,
} from "@/types/fault"

import { reportFaultAction } from "@/lib/faults/actions"
import {
  INITIAL_REPORT_FAULT_VALUES,
  REPORT_FAULT_FIELDS,
  REPORT_FAULT_FAILURE_MESSAGE,
  reportFaultSchema,
  type ReportFaultValues,
} from "@/lib/faults/report-schema"

const fieldClassName =
  "h-12 rounded-[16px] border border-input bg-input/70 px-4 text-base text-foreground placeholder:text-muted-foreground"

const actionLinkClassName =
  "inline-flex h-12 items-center justify-center rounded-[16px] bg-secondary px-6 text-base font-semibold text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

export function ReportFaultForm() {
  const [formError, setFormError] = useState("")
  const [isPending, startTransition] = useTransition()
  const form = useForm<ReportFaultValues>({
    resolver: zodResolver(reportFaultSchema),
    defaultValues: INITIAL_REPORT_FAULT_VALUES,
  })

  const onSubmit = form.handleSubmit((values) => {
    setFormError("")
    form.clearErrors()

    const formData = new FormData()
    for (const field of REPORT_FAULT_FIELDS) {
      formData.set(field, values[field])
    }

    startTransition(async () => {
      try {
        const result = await reportFaultAction(formData)

        if (result.fieldErrors) {
          for (const field of REPORT_FAULT_FIELDS) {
            const message = result.fieldErrors[field]
            if (message) {
              form.setError(field, { type: "server", message })
            }
          }
        }

        setFormError(result.error ?? "")
      } catch {
        setFormError(REPORT_FAULT_FAILURE_MESSAGE)
      }
    })
  })

  return (
    <form
      id="report-fault-form"
      noValidate
      onSubmit={onSubmit}
      className="space-y-5 sm:space-y-6"
    >
      {formError ? (
        <p
          role="alert"
          className="rounded-[12px] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {formError}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="fault-title">What is the fault?</Label>
        <Input
          id="fault-title"
          autoComplete="off"
          maxLength={120}
          aria-invalid={Boolean(form.formState.errors.title)}
          aria-describedby={
            form.formState.errors.title ? "fault-title-error" : undefined
          }
          {...form.register("title")}
          className={cn(
            fieldClassName,
            form.formState.errors.title && "border-destructive shadow-none",
          )}
        />
        {form.formState.errors.title ? (
          <p id="fault-title-error" role="alert" className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="fault-category">Category</Label>
          <select
            id="fault-category"
            aria-invalid={Boolean(form.formState.errors.category)}
            aria-describedby={
              form.formState.errors.category
                ? "fault-category-error"
                : undefined
            }
            {...form.register("category")}
            className={cn(
              "h-12 w-full rounded-[16px] border border-input bg-input/70 px-4 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              form.formState.errors.category && "border-destructive",
            )}
          >
            {FAULT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
          {form.formState.errors.category ? (
            <p id="fault-category-error" role="alert" className="text-sm text-destructive">
              {form.formState.errors.category.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fault-building">Hostel or building</Label>
          <Input
            id="fault-building"
            autoComplete="off"
            maxLength={120}
            aria-invalid={Boolean(form.formState.errors.building)}
            aria-describedby={
              form.formState.errors.building
                ? "fault-building-error"
                : undefined
            }
            {...form.register("building")}
            className={cn(
              fieldClassName,
              form.formState.errors.building && "border-destructive shadow-none",
            )}
          />
          {form.formState.errors.building ? (
            <p id="fault-building-error" role="alert" className="text-sm text-destructive">
              {form.formState.errors.building.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fault-location">Room or area</Label>
        <Input
          id="fault-location"
          autoComplete="off"
          maxLength={200}
          aria-invalid={Boolean(form.formState.errors.location_detail)}
          aria-describedby={
            form.formState.errors.location_detail
              ? "fault-location-error"
              : undefined
          }
          {...form.register("location_detail")}
          className={cn(
            fieldClassName,
            form.formState.errors.location_detail &&
              "border-destructive shadow-none",
          )}
        />
        {form.formState.errors.location_detail ? (
          <p id="fault-location-error" role="alert" className="text-sm text-destructive">
            {form.formState.errors.location_detail.message}
          </p>
        ) : null}
      </div>

      <fieldset
        aria-invalid={Boolean(form.formState.errors.priority)}
        className="space-y-2"
      >
        <legend className="mb-2 text-sm font-semibold text-foreground">
          How urgent is it?
        </legend>
        <div
          role="radiogroup"
          aria-describedby={
            form.formState.errors.priority
              ? "fault-priority-help fault-priority-error"
              : "fault-priority-help"
          }
          className={cn(
            "grid grid-cols-3 gap-1 rounded-[16px] bg-muted p-1",
            form.formState.errors.priority && "ring-1 ring-destructive",
          )}
        >
          {FAULT_PRIORITIES.map((priority) => (
            <label
              key={priority}
              htmlFor={`fault-priority-${priority}`}
              className="relative flex h-11 cursor-pointer items-center justify-center rounded-[12px] text-sm font-semibold text-muted-foreground transition-colors has-[:checked]:bg-card has-[:checked]:text-foreground has-[:checked]:shadow-sm has-[:checked]:ring-1 has-[:checked]:ring-border"
            >
              <input
                id={`fault-priority-${priority}`}
                type="radio"
                value={priority}
                aria-describedby={
                  form.formState.errors.priority
                    ? "fault-priority-help fault-priority-error"
                    : "fault-priority-help"
                }
                className="peer sr-only"
                {...form.register("priority")}
              />
              <span className="peer-focus-visible:rounded-[12px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                {PRIORITY_LABELS[priority]}
              </span>
            </label>
          ))}
        </div>
        <p id="fault-priority-help" className="text-sm text-muted-foreground">
          {PRIORITY_LABELS[FAULT_PRIORITIES[2]]} is for safety risks or faults
          that block many people.
        </p>
        {form.formState.errors.priority ? (
          <p id="fault-priority-error" role="alert" className="text-sm text-destructive">
            {form.formState.errors.priority.message}
          </p>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="fault-description">Description</Label>
        <Textarea
          id="fault-description"
          maxLength={2000}
          aria-invalid={Boolean(form.formState.errors.description)}
          aria-describedby={
            form.formState.errors.description
              ? "fault-description-error"
              : undefined
          }
          {...form.register("description")}
          className={cn(
            "min-h-36 resize-y rounded-[16px] border border-input bg-input/70 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground",
            form.formState.errors.description &&
              "border-destructive shadow-none",
          )}
        />
        {form.formState.errors.description ? (
          <p id="fault-description-error" role="alert" className="text-sm text-destructive">
            {form.formState.errors.description.message}
          </p>
        ) : null}
      </div>

      <div className="hidden justify-end gap-3 border-t border-border pt-6 sm:flex">
        <Link href="/faults" className={actionLinkClassName}>
          Cancel
        </Link>
        <Button
          type="submit"
          disabled={isPending}
          className="h-12 rounded-[16px] px-6 text-base font-semibold"
        >
          {isPending ? "Submitting..." : "Submit report"}
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-[480px] gap-3">
          <Link
            href="/faults"
            className={cn(actionLinkClassName, "min-w-0 flex-1")}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            form="report-fault-form"
            disabled={isPending}
            className="h-12 min-w-0 flex-1 rounded-[16px] px-4 text-base font-semibold"
          >
            {isPending ? "Submitting..." : "Submit report"}
          </Button>
        </div>
      </div>
    </form>
  )
}