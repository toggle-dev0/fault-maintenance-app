"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { unstable_rethrow } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  CATEGORY_LABELS,
  FAULT_CATEGORIES,
  FAULT_PRIORITIES,
  PRIORITY_LABELS,
} from "@/types/fault"

import { recordPhotos, reportFaultAction } from "@/lib/faults/actions"
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

const MAX_PHOTOS = 3
const MAX_PHOTO_SIZE = 5 * 1024 * 1024
const ACCEPTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

type SelectedPhoto = {
  file: File
  previewUrl: string
  error?: string
}

async function resizePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  })
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext("2d")

  try {
    if (!context) {
      throw new Error("Unable to process this photo.")
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Unable to process this photo."))
          }
        },
        "image/jpeg",
        0.82
      )
    })
  } finally {
    bitmap.close()
    canvas.width = 0
    canvas.height = 0
  }
}

export function ReportFaultForm() {
  const router = useRouter()
  const [formError, setFormError] = useState("")
  const [photos, setPhotos] = useState<SelectedPhoto[]>([])
  const [photoError, setPhotoError] = useState("")
  const [progress, setProgress] = useState("")
  const [isPending, startTransition] = useTransition()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const previewUrls = useRef(new Set<string>())
  const form = useForm<ReportFaultValues>({
    resolver: zodResolver(reportFaultSchema),
    defaultValues: INITIAL_REPORT_FAULT_VALUES,
  })

  useEffect(
    () => () => {
      for (const previewUrl of previewUrls.current) {
        URL.revokeObjectURL(previewUrl)
      }
    },
    []
  )

  function addPhotos(files: FileList | File[]) {
    const selectedFiles = Array.from(files)
    const validFiles = selectedFiles.filter((file) =>
      ACCEPTED_PHOTO_TYPES.has(file.type)
    )
    const hasInvalidType = validFiles.length !== selectedFiles.length

    setPhotoError(
      hasInvalidType ? "Choose photos in JPEG, PNG, or WebP format." : ""
    )
    setPhotos((currentPhotos) => [
      ...currentPhotos,
      ...validFiles.map((file) => {
        const previewUrl = URL.createObjectURL(file)
        previewUrls.current.add(previewUrl)
        return { file, previewUrl }
      }),
    ])
  }

  function removePhoto(photoToRemove: SelectedPhoto) {
    URL.revokeObjectURL(photoToRemove.previewUrl)
    previewUrls.current.delete(photoToRemove.previewUrl)
    setPhotos((currentPhotos) =>
      currentPhotos.filter((photo) => photo !== photoToRemove)
    )
  }

  const onSubmit = form.handleSubmit((values) => {
    setFormError("")
    form.clearErrors()
    setProgress("Submitting...")

    if (
      photos.length > MAX_PHOTOS ||
      photos.some((photo) => photo.error)
    ) {
      setProgress("")
      return
    }

    const formData = new FormData()
    for (const field of REPORT_FAULT_FIELDS) {
      formData.set(field, values[field])
    }

    startTransition(async () => {
      const resizedPhotos: Blob[] = []

      for (let index = 0; index < photos.length; index += 1) {
        try {
          const resizedPhoto = await resizePhoto(photos[index].file)

          if (resizedPhoto.size > MAX_PHOTO_SIZE) {
            setPhotos((currentPhotos) =>
              currentPhotos.map((photo) =>
                photo === photos[index]
                  ? {
                      ...photo,
                      error: "This photo is still over 5 MB after resizing.",
                    }
                  : photo,
              ),
            )
            setProgress("")
            return
          }

          resizedPhotos.push(resizedPhoto)
        } catch {
          setPhotos((currentPhotos) =>
            currentPhotos.map((photo) =>
              photo === photos[index]
                ? {
                    ...photo,
                    error:
                      "This photo could not be decoded. Choose a JPEG, PNG, or WebP image.",
                  }
                : photo,
            ),
          )
          setProgress("")
          return
        }
      }

      let result

      try {
        result = await reportFaultAction(formData)

        if (result.fieldErrors) {
          for (const field of REPORT_FAULT_FIELDS) {
            const message = result.fieldErrors[field]
            if (message) {
              form.setError(field, { type: "server", message })
            }
          }

          setProgress("")
          return
        }

        if (result.error || !result.faultId) {
          setFormError(result.error ?? REPORT_FAULT_FAILURE_MESSAGE)
          setProgress("")
          return
        }
      } catch (error) {
        unstable_rethrow(error)
        setFormError(REPORT_FAULT_FAILURE_MESSAGE)
        setProgress("")
        return
      }

      const faultId = result.faultId
      let photoUploadFailed = false
      let photoCleanupFailed = false

      if (resizedPhotos.length > 0) {
        let supabase: ReturnType<typeof createSupabaseBrowserClient> | undefined
        const uploadedPaths: string[] = []

        try {
          supabase = createSupabaseBrowserClient()

          for (let index = 0; index < resizedPhotos.length; index += 1) {
            setProgress(
              `Uploading photo ${index + 1} of ${resizedPhotos.length}`
            )
            const path = `${faultId}/${crypto.randomUUID()}.jpg`
            const { error } = await supabase.storage
              .from("fault-photos")
              .upload(path, resizedPhotos[index], {
                contentType: "image/jpeg",
                upsert: false,
              })

            if (error) {
              throw new Error("Photo upload failed.")
            }

            uploadedPaths.push(path)
          }

          const recordResult = await recordPhotos(faultId, uploadedPaths)

          if (!recordResult.success) {
            throw new Error("Photo records could not be saved.")
          }
        } catch {
          photoUploadFailed = true

          if (supabase && uploadedPaths.length > 0) {
            try {
              const { error } = await supabase.storage
                .from("fault-photos")
                .remove(uploadedPaths)
              photoCleanupFailed = Boolean(error)
            } catch {
              photoCleanupFailed = true
            }
          }
        }
      }

      router.replace(
        `/faults?new=${faultId}${photoUploadFailed ? "&photos=failed" : ""}${photoCleanupFailed ? "&cleanup=failed" : ""}`
      )
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
      <p
        aria-live="polite"
        className={progress ? "text-sm text-muted-foreground" : "sr-only"}
      >
        {progress}
      </p>

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

      <div className="space-y-2">
        <Label htmlFor="fault-photos">Photos (optional)</Label>
        <input
          ref={photoInputRef}
          id="fault-photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={isPending}
          onChange={(event) => {
            addPhotos(event.currentTarget.files ?? [])
            event.currentTarget.value = ""
          }}
        />
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            if (!isPending) {
              addPhotos(event.dataTransfer.files)
            }
          }}
          className="rounded-[16px] border-2 border-dashed border-input bg-card px-4 py-6 text-center sm:px-6 sm:py-8"
        >
          <p className="text-sm text-muted-foreground sm:hidden">
            Tap to add photos. Up to 3 images.
          </p>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Drop photos here or browse. Up to 3 images.
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => photoInputRef.current?.click()}
            className="mt-3 h-11 min-w-11 rounded-[16px] px-4"
          >
            browse
          </Button>
        </div>
        {photos.length > 0 ? (
          <ul className="space-y-2">
            {photos.map((photo, index) => (
              <li
                key={photo.previewUrl}
                className="flex items-center gap-3 rounded-[16px] border border-border bg-card p-3"
              >
                <Image
                  src={photo.previewUrl}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
                  className="h-14 w-14 rounded-[12px] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Photo {index + 1}
                  </p>
                  {photo.error ? (
                    <p role="alert" className="text-sm text-destructive">
                      {photo.error}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label={`Remove photo ${index + 1}`}
                  disabled={isPending}
                  onClick={() => removePhoto(photo)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {[
          photoError,
          photos.length > MAX_PHOTOS ? "Choose no more than 3 photos." : "",
        ]
          .filter(Boolean)
          .map((message) => (
            <p key={message} role="alert" className="text-sm text-destructive">
              {message}
            </p>
          ))}
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
