"use client"

import { useState, useTransition } from "react"

import { retryFaultPhoto } from "@/app/(app)/faults/[id]/actions"

type Photo = {
  path: string
  signedUrl: string | null
}

const photoErrorMessage = "Unable to load this photo."

export default function FaultPhotos({
  faultId,
  photos,
}: {
  faultId: string
  photos: Photo[]
}) {
  return (
    <div className="mt-5 max-w-full overflow-x-auto">
      <div className="flex w-max gap-3">
        {photos.map((photo, index) => (
          <FaultPhoto
            key={photo.path}
            faultId={faultId}
            photo={photo}
            index={index}
            total={photos.length}
          />
        ))}
      </div>
    </div>
  )
}

function FaultPhoto({
  faultId,
  photo,
  index,
  total,
}: {
  faultId: string
  photo: Photo
  index: number
  total: number
}) {
  const [signedUrl, setSignedUrl] = useState(photo.signedUrl)
  const [error, setError] = useState(photo.signedUrl ? null : photoErrorMessage)
  const [isPending, startTransition] = useTransition()

  function retry() {
    startTransition(async () => {
      try {
        const result = await retryFaultPhoto(faultId, photo.path)
        setSignedUrl(result.signedUrl)
        setError(result.error)
      } catch {
        setSignedUrl(null)
        setError(photoErrorMessage)
      }
    })
  }

  function handleImageError() {
    setSignedUrl(null)
    setError(photoErrorMessage)
  }

  if (!signedUrl) {
    return (
      <div
        role="group"
        aria-label={`Photo ${index + 1} of ${total}`}
        aria-busy={isPending}
        className="flex h-[104px] w-[140px] shrink-0 flex-col items-center justify-center gap-2 rounded-[16px] border border-border bg-muted p-3 text-center sm:h-[120px] sm:w-[168px]"
      >
        <p role="alert" className="text-xs text-muted-foreground">
          {error}
        </p>
        <button
          type="button"
          onClick={retry}
          disabled={isPending}
          className="min-h-11 rounded-[16px] px-3 text-sm font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {isPending ? "Retrying…" : "Retry"}
        </button>
      </div>
    )
  }

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open photo ${index + 1} in a new tab`}
      className="block h-[104px] w-[140px] shrink-0 overflow-hidden rounded-[16px] border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-[120px] sm:w-[168px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Signed Supabase URLs are displayed at fixed dimensions and loaded lazily. */}
      <img
        src={signedUrl}
        alt={`Photo ${index + 1} of ${total} for this fault`}
        width={168}
        height={120}
        loading="lazy"
        onError={handleImageError}
        className="h-full w-full object-cover"
      />
    </a>
  )
}
