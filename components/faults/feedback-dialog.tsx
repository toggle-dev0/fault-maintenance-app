"use client"

import { useActionState, useRef, useState, type FormEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Star } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FEEDBACK_COMMENT_MAX } from "@/lib/faults"
import { cn } from "@/lib/utils"
import {
  submitFeedback,
  type FeedbackActionState,
} from "@/app/(app)/faults/[id]/actions"

type FeedbackDialogProps = {
  faultId: string
  faultTitle: string
  initiallyOpen: boolean
}

const initialActionState: FeedbackActionState = { error: null }

export function FeedbackDialog({
  faultId,
  faultTitle,
  initiallyOpen,
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(initiallyOpen)
  const [rating, setRating] = useState<number | null>(null)
  const [ratingError, setRatingError] = useState(false)
  const [comment, setComment] = useState("")
  const [state, formAction, pending] = useActionState(
    submitFeedback,
    initialActionState,
  )
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    if (params.has("feedback")) {
      params.delete("feedback")
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (rating === null) {
      event.preventDefault()
      setRatingError(true)
      return
    }

    setRatingError(false)
  }

  const errorMessage = ratingError
    ? "Please select a rating."
    : state.error

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            ref={triggerRef}
            type="button"
            className="inline-flex h-12 w-full items-center justify-center rounded-[16px] bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-10"
          >
            Leave feedback
          </button>
        }
      />
      <DialogContent
        aria-labelledby="feedback-dialog-title"
        finalFocus={() => triggerRef.current}
        showCloseButton={false}
        className="inset-x-0 top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-[24px] rounded-b-none border border-border bg-card px-6 pt-3 pb-6 text-foreground shadow-[var(--shadow-floating)] dark:shadow-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[480px] sm:max-w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[24px] sm:p-8"
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-6 h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden"
        />
        <DialogTitle
          id="feedback-dialog-title"
          className="font-heading text-[28px] leading-tight tracking-[-0.04em] text-foreground sm:text-[30px]"
        >
          How was the repair?
        </DialogTitle>
        <p className="mt-2 text-base text-muted-foreground sm:text-lg">
          {faultTitle}
        </p>

        <form action={formAction} onSubmit={handleSubmit}>
          <input type="hidden" name="faultId" value={faultId} />

          <fieldset
            aria-describedby={errorMessage ? "feedback-error" : undefined}
            aria-invalid={Boolean(ratingError)}
            className="mt-6"
          >
            <legend className="sr-only">Rating</legend>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1
                const isFilled = rating !== null && value <= rating

                return (
                  <label
                    key={value}
                    className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full"
                  >
                    <input
                      type="radio"
                      name="rating"
                      value={value}
                      aria-label={`${value} star`}
                      checked={rating === value}
                      onChange={() => {
                        setRating(value)
                        setRatingError(false)
                      }}
                      className="peer sr-only"
                    />
                    <span className="inline-flex size-11 items-center justify-center rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                      <Star
                        aria-hidden="true"
                        className={cn(
                          "size-7",
                          isFilled
                            ? "fill-primary text-primary"
                            : "fill-transparent text-primary",
                        )}
                      />
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {errorMessage ? (
            <p
              id="feedback-error"
              role="alert"
              className="mt-2 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-5">
            <label
              htmlFor="feedback-comment"
              className="text-base font-semibold text-foreground"
            >
              Comments (optional)
            </label>
            <Textarea
              id="feedback-comment"
              name="comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={FEEDBACK_COMMENT_MAX}
              rows={4}
              className="mt-2 min-h-[120px] rounded-[16px] border-transparent bg-input/70 p-4 text-base text-foreground sm:min-h-[156px]"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-[16px] px-6 text-base font-semibold sm:h-10 sm:w-auto sm:min-w-[180px]"
            >
              Send feedback
            </Button>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full rounded-[16px] text-primary sm:h-10 sm:w-auto sm:min-w-[120px] sm:bg-secondary sm:text-secondary-foreground"
                />
              }
            >
              Cancel
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
