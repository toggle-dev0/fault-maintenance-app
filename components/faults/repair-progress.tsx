import { FAULT_STATUSES } from "@/types/fault"
import type { FaultStatus } from "@/types/fault"

export function RepairProgress({
  status,
  className,
}: {
  status: FaultStatus
  className?: string
}) {
  const currentStep = FAULT_STATUSES.indexOf(status) + 1

  return (
    <div
      role="img"
      aria-label={`Repair progress, step ${currentStep} of ${FAULT_STATUSES.length}`}
      className={`grid w-full max-w-[180px] grid-cols-4 gap-1 ${className ?? ""}`}
    >
      {FAULT_STATUSES.map((step, index) => (
        <span
          key={step}
          aria-hidden="true"
          className={`h-1 rounded-full ${
            index < currentStep ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  )
}
