// FixTrack behaviour tests: roles, policies, triggers and photo storage.
// Runs against your DEV Supabase project through the real API.   pnpm test:rls
//
// It creates five throwaway accounts (emails start with "fxtest-"), tries things each
// role must and must not be able to do, then deletes everything it created.
// NEVER point this at the production project.

import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL ?? ""
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? ""
const secretKey = process.env.SUPABASE_SECRET_KEY ?? ""
const projectRef = process.env.SUPABASE_DEV_PROJECT_REF ?? ""

if (!url || !publishableKey || !secretKey || !projectRef) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY and SUPABASE_DEV_PROJECT_REF in .env.test",
  )
}
if (!url.includes(projectRef)) {
  throw new Error("SUPABASE_URL does not contain SUPABASE_DEV_PROJECT_REF. Refusing to run.")
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } }
const service: SupabaseClient = createClient(url, secretKey, clientOptions)

type Name = "alice" | "bob" | "tina" | "tom" | "adam"
type Person = { id: string; client: SupabaseClient }
type Result = { data: unknown; error: { message: string; code?: string } | null }

const roles: Record<Name, "user" | "technician" | "admin"> = {
  alice: "user",
  bob: "user",
  tina: "technician",
  tom: "technician",
  adam: "admin",
}
const people = {} as Record<Name, Person>
const runId = Date.now().toString(36)
const password = `Fx-${crypto.randomUUID()}`
const BUCKET = "fault-photos"
// 1x1 transparent PNG
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

// Errors that mean "the test is wrong or the schema is missing", never "access denied".
const TEST_BUG_CODES = new Set(["42703", "42601", "42P01", "42883", "22P02", "PGRST200", "PGRST204", "PGRST205"])

function blocked(res: Result, label: string) {
  if (res.error?.code && TEST_BUG_CODES.has(res.error.code)) {
    assert.fail(`${label}: test bug or missing schema (${res.error.code}: ${res.error.message})`)
  }
  const emptyRows = Array.isArray(res.data) && res.data.length === 0
  assert.ok(res.error !== null || emptyRows, `${label}: was ALLOWED (data=${JSON.stringify(res.data)})`)
}

function ok<R extends { data: unknown; error: { message: string } | null }>(res: R, label: string): NonNullable<R["data"]> {
  assert.equal(res.error, null, `${label}: ${res.error?.message}`)
  assert.ok(res.data !== null && res.data !== undefined, `${label}: no data returned`)
  return res.data as NonNullable<R["data"]>
}

async function cleanup(extraIds: string[] = []) {
  const { data: list } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const ids = new Set(extraIds)
  for (const u of list?.users ?? []) if (u.email?.startsWith("fxtest-")) ids.add(u.id)
  if (ids.size === 0) return
  const { data: faults } = await service.from("faults").select("id").in("reported_by", [...ids])
  const faultIds = (faults ?? []).map((f) => f.id as string)
  for (const fid of faultIds) {
    const { data: files } = await service.storage.from(BUCKET).list(fid)
    if (files?.length) await service.storage.from(BUCKET).remove(files.map((f) => `${fid}/${f.name}`))
  }
  if (faultIds.length) await service.from("faults").delete().in("id", faultIds)
  for (const id of ids) await service.auth.admin.deleteUser(id)
}

async function createPeople() {
  for (const name of Object.keys(roles) as Name[]) {
    const email = `fxtest-${runId}-${name}@example.com`
    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, organization: "Hostel 1" },
    })
    const id = ok(created, `create ${name}`).user?.id
    assert.ok(id, `create ${name}: no user id`)
    if (roles[name] !== "user") {
      ok(await service.from("profiles").update({ role: roles[name] }).eq("id", id).select(), `set role ${name}`)
    }
    const client = createClient(url, publishableKey, clientOptions)
    ok(await client.auth.signInWithPassword({ email, password }), `sign in ${name}`)
    people[name] = { id, client }
  }
}

const newFault = (reporter: string) => ({
  reported_by: reporter,
  title: "Broken bed frame",
  description: "Slat snapped",
  category: "furniture",
  building: "Hostel 2",
  location_detail: "Room 114",
  priority: "medium",
})

describe("FixTrack roles, policies and storage", () => {
  let faultId = ""
  const photoPath = () => `${faultId}/a.png`

  before(async () => {
    await cleanup()
    await createPeople()
  })

  after(async () => {
    await cleanup(Object.values(people).map((p) => p.id))
  })

  describe("accounts and profiles", () => {
    it("new accounts get the role the service gave them, nobody else can change it", async () => {
      for (const name of Object.keys(roles) as Name[]) {
        const row = ok(await people[name].client.from("profiles").select("role").eq("id", people[name].id).single(), name)
        assert.equal(row.role, roles[name])
      }
    })
    it("a user cannot promote themselves or others", async () => {
      blocked(await people.alice.client.from("profiles").update({ role: "admin" }).eq("id", people.alice.id).select(), "self-promote")
      blocked(await people.alice.client.from("profiles").update({ role: "admin" }).eq("id", people.bob.id).select(), "promote other")
      blocked(await people.tina.client.from("profiles").update({ role: "admin" }).eq("id", people.tina.id).select(), "technician self-promote")
    })
    it("a user can edit their own display name but not someone else's", async () => {
      ok(await people.alice.client.from("profiles").update({ display_name: "Alice O" }).eq("id", people.alice.id).select(), "own name")
      blocked(await people.alice.client.from("profiles").update({ display_name: "x" }).eq("id", people.bob.id).select(), "other's name")
    })
    it("anonymous visitors can read nothing", async () => {
      const anon = createClient(url, publishableKey, clientOptions)
      blocked(await anon.from("faults").select("id"), "anon faults")
      blocked(await anon.from("profiles").select("id"), "anon profiles")
      assert.ok((await anon.rpc("current_app_role")).error !== null, "anon must not run current_app_role()")
    })
  })

  describe("reporting a fault", () => {
    it("a user can report a fault as themselves", async () => {
      const row = ok(await people.alice.client.from("faults").insert(newFault(people.alice.id)).select().single(), "insert")
      faultId = row.id as string
      assert.equal(row.status, "reported")
      assert.equal(row.assigned_to, null)
    })
    it("a user cannot report as someone else", async () => {
      blocked(await people.alice.client.from("faults").insert({ ...newFault(people.bob.id) }).select(), "as bob")
    })
    it("a user cannot create a fault that is already resolved or pre-assigned", async () => {
      blocked(await people.alice.client.from("faults").insert({ ...newFault(people.alice.id), status: "resolved" }).select(), "resolved")
      blocked(await people.alice.client.from("faults").insert({ ...newFault(people.alice.id), status: "assigned", assigned_to: people.tina.id }).select(), "pre-assigned")
    })
    it("an invalid category is rejected", async () => {
      blocked(await people.alice.client.from("faults").insert({ ...newFault(people.alice.id), category: "heating" }).select(), "category")
    })
  })

  describe("who can see what", () => {
    it("other users and unassigned technicians see nothing", async () => {
      for (const who of ["bob", "tina", "tom"] as Name[]) {
        const rows = ok(await people[who].client.from("faults").select("id").eq("id", faultId), who)
        assert.equal(rows.length, 0, `${who} should not see the fault`)
      }
    })
    it("the reporter and the admin see it", async () => {
      for (const who of ["alice", "adam"] as Name[]) {
        const rows = ok(await people[who].client.from("faults").select("id").eq("id", faultId), who)
        assert.equal(rows.length, 1, `${who} should see the fault`)
      }
    })
    it("the admin can list technicians to assign work", async () => {
      const rows = ok(await people.adam.client.from("profiles").select("id").eq("role", "technician"), "technicians")
      const ids = rows.map((r) => r.id)
      assert.ok(ids.includes(people.tina.id) && ids.includes(people.tom.id))
    })
    it("a user cannot edit or delete their own report", async () => {
      blocked(await people.alice.client.from("faults").update({ title: "changed" }).eq("id", faultId).select(), "edit")
      blocked(await people.alice.client.from("faults").delete().eq("id", faultId).select(), "delete")
    })
  })

  describe("assignment by the admin", () => {
    it("the admin cannot assign to a regular user or to themselves", async () => {
      blocked(await people.adam.client.from("faults").update({ assigned_to: people.bob.id }).eq("id", faultId).select(), "to user")
      blocked(await people.adam.client.from("faults").update({ assigned_to: people.adam.id }).eq("id", faultId).select(), "to admin")
    })
    it("the admin can assign to a technician and status moves to 'assigned'", async () => {
      const row = ok(await people.adam.client.from("faults").update({ assigned_to: people.tina.id }).eq("id", faultId).select().single(), "assign")
      assert.equal(row.status, "assigned")
    })
    it("the admin can change priority but not who reported it", async () => {
      ok(await people.adam.client.from("faults").update({ priority: "critical" }).eq("id", faultId).select(), "priority")
      blocked(await people.adam.client.from("faults").update({ reported_by: people.bob.id }).eq("id", faultId).select(), "reporter")
    })
  })

  describe("the technician", () => {
    it("an unrelated technician cannot see or change it", async () => {
      assert.equal(ok(await people.tom.client.from("faults").select("id").eq("id", faultId), "tom").length, 0)
      blocked(await people.tom.client.from("faults").update({ status: "in_progress" }).eq("id", faultId).select(), "tom update")
    })
    it("the assigned technician sees it but cannot edit anything except status", async () => {
      assert.equal(ok(await people.tina.client.from("faults").select("id").eq("id", faultId), "tina").length, 1)
      blocked(await people.tina.client.from("faults").update({ title: "hacked" }).eq("id", faultId).select(), "title")
      blocked(await people.tina.client.from("faults").update({ priority: "low" }).eq("id", faultId).select(), "priority")
      blocked(await people.tina.client.from("faults").update({ assigned_to: people.tom.id }).eq("id", faultId).select(), "reassign")
    })
    it("status can only move forward one step at a time", async () => {
      blocked(await people.tina.client.from("faults").update({ status: "resolved" }).eq("id", faultId).select(), "skip to resolved")
      blocked(await people.tina.client.from("faults").update({ status: "reported" }).eq("id", faultId).select(), "back to reported")
      ok(await people.tina.client.from("faults").update({ status: "in_progress" }).eq("id", faultId).select(), "start work")
    })
    it("only the assigned technician or an admin can add repair notes", async () => {
      ok(await people.tina.client.from("fault_updates").insert({ fault_id: faultId, author_id: people.tina.id, kind: "note", note: "Slat collected" }).select(), "tina note")
      blocked(await people.tom.client.from("fault_updates").insert({ fault_id: faultId, author_id: people.tom.id, kind: "note", note: "x" }).select(), "tom note")
      blocked(await people.alice.client.from("fault_updates").insert({ fault_id: faultId, author_id: people.alice.id, kind: "note", note: "x" }).select(), "alice note")
      blocked(await people.tina.client.from("fault_updates").insert({ fault_id: faultId, author_id: people.tom.id, kind: "note", note: "x" }).select(), "forged author")
      blocked(await people.tina.client.from("fault_updates").insert({ fault_id: faultId, author_id: people.tina.id, kind: "status_changed" }).select(), "forged log entry")
    })
  })

  describe("timeline and names", () => {
    it("the reporter sees the whole timeline, strangers see none", async () => {
      assert.equal(ok(await people.alice.client.from("fault_updates").select("id").eq("fault_id", faultId), "alice").length, 4)
      assert.equal(ok(await people.bob.client.from("fault_updates").select("id").eq("fault_id", faultId), "bob").length, 0)
    })
    it("people see the other party on their own faults, and nobody else", async () => {
      const seen = async (viewer: Name, target: Name) =>
        ok(await people[viewer].client.from("profiles").select("id").eq("id", people[target].id), `${viewer}->${target}`).length
      assert.equal(await seen("alice", "tina"), 1)
      assert.equal(await seen("alice", "tom"), 0)
      assert.equal(await seen("tina", "alice"), 1)
      assert.equal(await seen("tina", "bob"), 0)
    })
  })

  describe("feedback", () => {
    it("feedback is blocked until the fault is resolved", async () => {
      blocked(await people.alice.client.from("fault_feedback").insert({ fault_id: faultId, user_id: people.alice.id, rating: 5 }).select(), "too early")
    })
    it("the technician can resolve it, which stamps resolved_at", async () => {
      const row = ok(await people.tina.client.from("faults").update({ status: "resolved" }).eq("id", faultId).select().single(), "resolve")
      assert.ok(row.resolved_at)
    })
    it("only the reporter can rate it, once, with 1 to 5", async () => {
      blocked(await people.bob.client.from("fault_feedback").insert({ fault_id: faultId, user_id: people.bob.id, rating: 5 }).select(), "bob rates")
      blocked(await people.alice.client.from("fault_feedback").insert({ fault_id: faultId, user_id: people.alice.id, rating: 9 }).select(), "rating 9")
      ok(await people.alice.client.from("fault_feedback").insert({ fault_id: faultId, user_id: people.alice.id, rating: 4, comment: "Good" }).select(), "rate")
      blocked(await people.alice.client.from("fault_feedback").insert({ fault_id: faultId, user_id: people.alice.id, rating: 5 }).select(), "second rating")
      blocked(await people.alice.client.from("fault_feedback").update({ rating: 1 }).eq("fault_id", faultId).select(), "edit rating")
    })
    it("feedback is visible to the reporter, the assigned technician and the admin only", async () => {
      const count = async (who: Name) => ok(await people[who].client.from("fault_feedback").select("id").eq("fault_id", faultId), who).length
      assert.equal(await count("alice"), 1)
      assert.equal(await count("tina"), 1)
      assert.equal(await count("adam"), 1)
      assert.equal(await count("bob"), 0)
      assert.equal(await count("tom"), 0)
    })
  })

  describe("photos and storage", () => {
    it("the reporter can add a photo record and upload the file", async () => {
      ok(await people.alice.client.from("fault_photos").insert({ fault_id: faultId, storage_path: photoPath(), uploaded_by: people.alice.id }).select(), "photo row")
      ok(await people.alice.client.storage.from(BUCKET).upload(photoPath(), png, { contentType: "image/png" }), "upload")
    })
    it("strangers cannot attach or upload photos, or see the file", async () => {
      blocked(await people.bob.client.from("fault_photos").insert({ fault_id: faultId, storage_path: `${faultId}/b.png`, uploaded_by: people.bob.id }).select(), "bob row")
      blocked(await people.bob.client.storage.from(BUCKET).upload(`${faultId}/b.png`, png, { contentType: "image/png" }), "bob upload")
      blocked(await people.bob.client.storage.from(BUCKET).list(faultId), "bob list")
    })
    it("uploads outside a real fault folder and non-image files are rejected", async () => {
      blocked(await people.alice.client.storage.from(BUCKET).upload("00000000-0000-0000-0000-000000000000/a.png", png, { contentType: "image/png" }), "fake folder")
      blocked(await people.alice.client.storage.from(BUCKET).upload(`${faultId}/notes.txt`, Buffer.from("hi"), { contentType: "text/plain" }), "text file")
    })
    it("the assigned technician can read the photo, and nobody can delete it", async () => {
      ok(await people.tina.client.storage.from(BUCKET).download(photoPath()), "tina download")
      blocked(await people.alice.client.storage.from(BUCKET).remove([photoPath()]), "alice delete")
      ok(await people.tina.client.storage.from(BUCKET).download(photoPath()), "still there")
    })
  })
})