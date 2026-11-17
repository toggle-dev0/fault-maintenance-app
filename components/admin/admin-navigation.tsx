"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function AdminNavigation({
  mobile = false,
}: {
  mobile?: boolean
}) {
  const pathname = usePathname()
  const staffIsActive =
    pathname === "/admin/staff" || pathname.startsWith("/admin/staff/")

  return (
    <nav
      aria-label="Admin navigation"
      className={
        mobile ? "px-4 py-2 sm:px-6 lg:hidden" : "hidden px-4 lg:block"
      }
    >
      <Link
        href="/admin/staff"
        aria-current={staffIsActive ? "page" : undefined}
        className={`flex ${
          mobile ? "min-h-11" : "min-h-12"
        } items-center rounded-[12px] px-3 text-sm font-semibold transition-colors ${
          staffIsActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        Staff
      </Link>
    </nav>
  )
}
