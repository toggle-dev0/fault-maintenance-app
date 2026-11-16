"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { FEEDBACK_COMMENT_MAX } from "@/lib/faults"
import { createClient } from "@/lib/supabase/server"

export type FeedbackActionState = {
  error: string | null
}

const feedbackSchema = z.object({
  faultId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(FEEDBACK_COMMENT_MAX)
    .transform((comment) => comment || null),
})

const photoSchema = z.object({
  faultId: z.string().uuid(),
  photoPath: z.string().min(1).max(1024),
})

const genericError = "Unable to send feedback. Please try again."
const photoError = "Unable to load this photo. Please try again."

export async function retryFaultPhoto(
  faultId: string,
  photoPath: string
): Promise<{ signedUrl: string | null; error: string | null }> {
  const parsed = photoSchema.safeParse({ faultId, photoPath })

  if (!parsed.success) {
    return { signedUrl: null, error: photoError }
  }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const userId = authData?.claims?.sub

  if (authError || !userId) {
    return { signedUrl: null, error: photoError }
  }

  const { data: photo, error: photoLookupError } = await supabase
    .from("fault_photos")
    .select("storage_path")
    .eq("fault_id", parsed.data.faultId)
    .eq("storage_path", parsed.data.photoPath)
    .maybeSingle()

  if (photoLookupError || !photo) {
    return { signedUrl: null, error: photoError }
  }

  const { data, error: signingError } = await supabase.storage
    .from("fault-photos")
    .createSignedUrls([photo.storage_path], 3600)
  const signedPhoto = data?.[0]

  if (signingError || !signedPhoto?.signedUrl || signedPhoto.error) {
    return { signedUrl: null, error: photoError }
  }

  return { signedUrl: signedPhoto.signedUrl, error: null }
}

export async function submitFeedback(
  _previousState: FeedbackActionState,
  formData: FormData
): Promise<FeedbackActionState> {
  const parsed = feedbackSchema.safeParse({
    faultId: formData.get("faultId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  })

  if (!parsed.success) {
    return { error: genericError }
  }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const userId = authData?.claims?.sub

  if (authError || !userId) {
    return { error: genericError }
  }

  const { error } = await supabase.from("fault_feedback").insert({
    fault_id: parsed.data.faultId,
    user_id: userId,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
  })

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "You have already rated this repair."
          : genericError,
    }
  }

  redirect(`/faults/${parsed.data.faultId}?feedback=thanks`)
}
