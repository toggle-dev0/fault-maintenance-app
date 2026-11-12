import Link from "next/link"
import { redirect } from "next/navigation"

import { LogoWordmark } from "@/components/illustrations"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { logoutAction } from "../actions"

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

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    redirect("/login")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", claims.sub)
    .maybeSingle()

  if (error) {
    throw error
  }

  const displayName = profile?.display_name ?? claims.email ?? "User"

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card sm:h-16">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label="FixTrack home" className="shrink-0">
            <LogoWordmark aria-hidden="true" className="h-8 w-28 sm:h-9 sm:w-[126px]" />
          </Link>

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
      {children}
    </div>
  )
}
