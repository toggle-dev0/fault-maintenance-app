import AddTechnicianForm from "@/components/admin/add-technician-form"
import { getRelativeTime } from "@/lib/faults"
import { createClient } from "@/lib/supabase/server"
import { isUserRole, ROLE_LABELS, USER_ROLES } from "@/types/fault"

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: staff, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, organization, created_at")
    .in("role", [USER_ROLES[1], USER_ROLES[2]])
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  const staffMembers = staff.map((member) => {
    if (!isUserRole(member.role)) {
      throw new Error(`Profile ${member.id} has an unsupported role`)
    }

    return { ...member, role: member.role }
  })

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
      <h1 className="font-heading text-[30px] leading-tight tracking-[-0.04em] text-foreground sm:text-[32px] lg:text-[34px]">
        Staff
      </h1>

      <div className="mt-6">
        <AddTechnicianForm />
      </div>

      <section aria-labelledby="staff-list-heading" className="mt-10">
        <h2
          id="staff-list-heading"
          className="font-heading text-2xl leading-tight tracking-[-0.03em] text-foreground"
        >
          Existing staff
        </h2>
        {staffMembers.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {staffMembers.map((member) => (
              <li
                key={member.id}
                className="flex flex-col gap-3 rounded-[24px] border border-border bg-card p-4 shadow-[var(--shadow-floating)] sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:shadow-none"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-card-foreground">
                    {member.display_name ?? "Unnamed staff member"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {member.organization ?? "No organization provided"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <span className="inline-flex min-h-7 items-center rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary">
                    {ROLE_LABELS[member.role]}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Joined {getRelativeTime(member.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-[24px] border border-border bg-card px-5 py-8 text-sm text-muted-foreground shadow-[var(--shadow-floating)] dark:shadow-none">
            No staff accounts yet.
          </p>
        )}
      </section>
    </main>
  )
}
