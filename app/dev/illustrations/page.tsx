// TEMPORARY, remove before release.
import type { CSSProperties } from "react"

import {
  AuthIllustration,
  EmptyTechnicianAssignments,
  EmptyUserFaults,
  ErrorGeneric,
  LogoMark,
  LogoWordmark,
  SuccessReportSubmitted,
} from "@/components/illustrations"

const lightTheme = {
  "--background": "var(--illustration-preview-background, #F8FAFC)",
  "--foreground": "var(--illustration-preview-foreground, #0F172A)",
  "--card": "var(--illustration-preview-card, #FFFFFF)",
  "--primary": "var(--illustration-preview-primary, #4F46E5)",
  "--primary-foreground":
    "var(--illustration-preview-primary-foreground, #FFFFFF)",
  "--accent": "var(--illustration-preview-accent, #E0E7FF)",
  "--border": "var(--illustration-preview-border, #E2E8F0)",
  "--muted": "var(--illustration-preview-muted, #F1F5F9)",
  "--shadow-color": "var(--illustration-preview-shadow-color, #0F172A)",
  "--status-critical-bg":
    "var(--illustration-preview-status-critical-bg, #FFE4E6)",
  "--status-critical-fg":
    "var(--illustration-preview-status-critical-fg, #9F1239)",
  "--status-progress-bg":
    "var(--illustration-preview-status-progress-bg, #E0F2FE)",
  "--status-progress-fg":
    "var(--illustration-preview-status-progress-fg, #075985)",
  "--status-resolved-bg":
    "var(--illustration-preview-status-resolved-bg, #D1FAE5)",
  "--status-resolved-fg":
    "var(--illustration-preview-status-resolved-fg, #065F46)",
  "--status-reported-fg":
    "var(--illustration-preview-status-reported-fg, #92400E)",
} as CSSProperties

const illustrations = [
  {
    name: "AuthIllustration",
    Component: AuthIllustration,
    className: "size-40",
  },
  {
    name: "EmptyTechnicianAssignments",
    Component: EmptyTechnicianAssignments,
    className: "size-40",
  },
  { name: "EmptyUserFaults", Component: EmptyUserFaults, className: "size-40" },
  { name: "ErrorGeneric", Component: ErrorGeneric, className: "size-40" },
  { name: "LogoMark", Component: LogoMark, className: "size-16" },
  { name: "LogoWordmark", Component: LogoWordmark, className: "h-16 w-56" },
  {
    name: "SuccessReportSubmitted",
    Component: SuccessReportSubmitted,
    className: "size-40",
  },
]

function IllustrationGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {illustrations.map(({ name, Component, className }) => (
        <div
          key={name}
          className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-6 text-foreground"
        >
          <Component className={className} />
          <span className="text-sm">{name}</span>
        </div>
      ))}
    </div>
  )
}

export default function IllustrationsPage() {
  return (
    <main className="min-h-svh space-y-8 bg-background p-8 text-foreground">
      <section className="space-y-4">
        <div
          className="space-y-4 rounded-2xl bg-background p-6 text-foreground"
          style={lightTheme}
        >
          <h1 className="text-2xl">Illustrations · Light</h1>
          <IllustrationGrid />
        </div>
      </section>
      <div className="dark space-y-4 rounded-2xl bg-background p-6 text-foreground">
        <h2 className="text-xl">Illustrations · Dark</h2>
        <IllustrationGrid />
      </div>
    </main>
  )
}
