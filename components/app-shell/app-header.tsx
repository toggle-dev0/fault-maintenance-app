import Link from "next/link"

import { LogoWordmark } from "@/components/illustrations"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/lib/actions"

type AppHeaderProps = {
  displayName: string
  logoVisibility?: "all" | "mobile-only" | "none"
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()

  return initials || "U"
}

export default function AppHeader({
  displayName,
  logoVisibility = "all",
}: AppHeaderProps) {
  const logoClassName =
    logoVisibility === "mobile-only" ? "shrink-0 lg:hidden" : "shrink-0"

  return (
    <header className="h-14 border-b border-border bg-card sm:h-16">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center">
          {logoVisibility !== "none" ? (
            <Link href="/" aria-label="FixTrack home" className={logoClassName}>
              <LogoWordmark
                aria-hidden="true"
                className="h-8 w-28 sm:h-9 sm:w-[126px]"
              />
            </Link>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="max-w-28 truncate text-sm font-medium text-foreground sm:max-w-48">
            {displayName}
          </span>
          <span
            role="img"
            aria-label={`${displayName} initials`}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground sm:size-10"
          >
            {getInitials(displayName)}
          </span>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              className="h-10 rounded-[12px] px-2.5 text-sm sm:px-3"
            >
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
