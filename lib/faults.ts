export const FEEDBACK_COMMENT_MAX = 1000

export function formatFaultRef(refNumber: number) {
  return `F-${String(refNumber).padStart(4, "0")}`
}

export function getRelativeTime(dateValue: string) {
  const elapsedSeconds = Math.round(
    (Date.now() - new Date(dateValue).getTime()) / 1000,
  )

  if (Math.abs(elapsedSeconds) < 60) {
    return "just now"
  }

  const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  const units = [
    { length: 60 * 60 * 24 * 365, name: "year" },
    { length: 60 * 60 * 24 * 30, name: "month" },
    { length: 60 * 60 * 24, name: "day" },
    { length: 60 * 60, name: "hour" },
    { length: 60, name: "minute" },
  ] as const

  const absoluteElapsedSeconds = Math.abs(elapsedSeconds)
  const unit = units.find(({ length }) => absoluteElapsedSeconds >= length)

  if (!unit) {
    return relativeTime.format(-1, "minute")
  }

  return relativeTime.format(
    -Math.sign(elapsedSeconds) *
      Math.round(absoluteElapsedSeconds / unit.length),
    unit.name,
  )
}
