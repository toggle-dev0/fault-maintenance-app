<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# FixTrack agent rules

Read this whole file before every task and follow it strictly. If a rule here conflicts with a request, say so and ask.

## Role

Act as a senior Next.js, TypeScript and Supabase engineer. Write simple, readable, secure code. Prefer clarity over cleverness and small diffs over big rewrites.

## Project overview

FixTrack (placeholder name, may change) is a web app where people report faults in their hostel or workplace, admins assign each fault to a technician, and everyone can follow the repair from reported to resolved.

Three roles only: `user`, `technician`, `admin`. Main features:

- Sign up and log in on one shared screen. Sign-up always creates a `user`.
- Users report faults (title, category, hostel or building, room or area, urgency, description, optional photos) and follow them on "My faults".
- Admins see all faults, assign each to a technician, and can change priority.
- Technicians see only faults assigned to them, move status forward, and add repair notes.
- Each fault has a repair log (timeline). Users rate a fault once, after it is resolved.

## Tech stack

Next.js 16 (App Router) and TypeScript strict. Tailwind CSS 4 and shadcn/ui. Supabase for Postgres, Auth and Storage, using `@supabase/supabase-js` and `@supabase/ssr`. Package manager is pnpm. Add React Hook Form and Zod when the first form is built.

No ORM. No global state library. No analytics yet. Do not add any other major library without asking.

## Decision rules

- Ask before installing any dependency, changing existing UI, or changing the database design.
- If something is unclear, ask one short question instead of guessing.
- If a change would touch something not mentioned in the task, stop and ask.
- Do not refactor or "clean up" working code unless asked.

## Development philosophy

Build one feature at a time, simplest working version first. Read the diff you produce. Keep each change small enough to review at a glance. No speculative abstractions: extract a component or helper only when it is reused or clearly makes a screen easier to read.

## Architecture

```
app/            routes and screens only: (auth)/ for login and sign-up, (app)/ for signed-in screens
components/     ui/ (shadcn, do not hand-edit), faults/ (domain components), illustrations/ (SVG components)
lib/            supabase/ (client.ts, server.ts, env.ts, admin.ts), utils.ts, other helpers
types/          database.types.ts (generated, never hand-edited)
supabase/       migrations/ (SQL, the source of truth for the database)
tests/          rls.test.ts (role and policy behaviour tests)
proxy.ts        refreshes the Supabase session only
```

Default landing by role after login: user goes to My faults, technician to My assignments, admin to Faults overview. Screens compose components and call server code. They hold no business rules.

User routes: /faults (My faults), /faults/new (report a fault), /faults/[id] (details). / redirects by role.

## Roles, data and security rules

- The database enforces access. Row Level Security is on for every table, and policies and triggers live in `supabase/migrations/`.
- Never edit a migration that has already been applied. Add a new timestamped migration for every database change.
- Never trust the client. Role checks in the UI are for display only and never replace policies.
- Identity on the server: use `supabase.auth.getClaims()`. Never use `getSession()` for access decisions.
- A user's role comes only from `public.profiles.role`. Never read it from user metadata or request input. Roles change only through SQL or a server-side admin action.
- Admins and technicians are created only by an admin through a server action that calls Supabase's admin API using the secret key in `lib/supabase/admin.ts`. That file imports `server-only` and is the only place the secret key is used.
- Use the clients in `lib/supabase/`. Do not create other Supabase clients.
- Do not cache responses that depend on the signed-in user.
- Fault status moves reported, assigned, in_progress, resolved. The database trigger enforces who may move it. The UI mirrors those rules and never replaces them.
- After any change under `supabase/migrations/`, run `pnpm test:rls`, update the tests to match, and regenerate `types/database.types.ts`. Never loosen a policy to make a test or a feature pass.

## UI rules

The design canvas is the source of truth: https://claude.ai/artifact/KyZNJTpZLE4JfgAmcALGkU

- Match the relevant board exactly: layout, spacing, type sizes, colours, radii, shadows, states. Do not approximate or simplify unless asked.
- Build desktop, tablet and mobile from the boards and the "Responsive rules" board. Breakpoints are 640 and 1024.
- Radii: 12 dense controls, 16 inputs and buttons, 24 cards and modals. Spacing is multiples of 4. Compact buttons are 44 high on mobile and tablet, 40 on desktop.
- Type: display 44, page title 34, heading 28, card title 16 semibold. Mobile and tablet sizes are on the Responsive rules board.
- Support light and dark mode for every screen. Light uses a soft shadow plus a 1px border. Dark uses the border only.
- Every input has a visible label. Keep contrast at least 4.5:1 for text.

## Styling rules

- Tailwind classes first. Colours come only from the design tokens in `app/globals.css` (from `fault-tokens.css`). No hard-coded hex values in components.
- Use the `cn` helper from `lib/utils.ts`.
- Inline `style` is allowed only for values calculated at runtime.
- Status and priority colours use the status tokens (reported, assigned, progress, resolved, critical).

## State rules

- Read data in Server Components. Write data in Server Actions. Validate every Server Action input with Zod.
- Local React state is for temporary UI state only (open modal, selected tab, form fields).
- No global store and no client-side data library until a feature clearly needs one. Ask first.
- Theme preference is the only thing stored in `localStorage`.

## TypeScript rules

- Strict mode. No `any`. No non-null assertions on data from the database.
- Use the generated database types. Keep other types small and simple.
- Allowed values for role, category, priority, status and update kind live in types/fault.ts. Change them in the same commit as the migration that changes the database constraint.

## Asset rules

- Illustrations live in `components/illustrations/` as one component per SVG, exported from `index.ts`. Screens import from there, never from raw SVG files.
- Components take colours from CSS variables, never hard-coded colours, so they work in light and dark mode. Namespace every class name inside an SVG (prefix `ft-`) so styles cannot leak globally.
- Names are descriptive: `AuthIllustration`, `EmptyUserFaults`, `EmptyTechnicianAssignments`, `SuccessReportSubmitted`, `ErrorGeneric`, `LogoMark`, `LogoWordmark`.
- Illustrations are decorative by default. Pass title only when the image carries meaning that nearby text doesn’t.

## Secret rules

- Only the Supabase URL and the publishable key may be `NEXT_PUBLIC_`. Everything else stays server-side.
- Secrets live in `.env.local` and `.env.test`. Never commit them, never log them, never print them in output.
- Never paste a key into a prompt, a test, or a source file.

## Definition of done

A task is done only when all of these pass, and you have actually run them:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm build`
4. `pnpm test:rls` (whenever the database, policies or auth code changed)

Then check the new feature works and that previously built features still do. Report any command you could not run. Never say something passes without running it.

## Communication

Be concise. Say what changed, which files, and how to test it. Flag anything you were unsure about or that deviates from these rules.

## Final reminder

Before every task: read this file, follow it strictly, keep the change small, match the designs exactly, and never weaken access control.
