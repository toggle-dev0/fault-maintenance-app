// Verifies types/database.types.ts is valid UTF-8 and matches the FixTrack schema.
// Run after `pnpm db:types`:   pnpm check:types
import { readFileSync } from "node:fs"
import ts from "typescript"

const file = process.argv[2] ?? "types/database.types.ts"
const problems = []
const notes = []

const bytes = readFileSync(file)
if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) problems.push("file starts with a UTF-8 BOM")
if (bytes.includes(0)) problems.push("file contains NUL bytes (probably UTF-16 from a PowerShell redirect)")
let text = ""
try {
  text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
} catch {
  problems.push("file is not valid UTF-8")
}

const columns = {
  profiles: ["id", "display_name", "organization", "role", "created_at"],
  faults: ["id", "ref_number", "reported_by", "assigned_to", "title", "description", "category", "building", "location_detail", "priority", "status", "created_at", "updated_at", "resolved_at"],
  fault_updates: ["id", "fault_id", "author_id", "kind", "assignee_id", "from_status", "to_status", "note", "created_at"],
  fault_feedback: ["id", "fault_id", "user_id", "rating", "comment", "created_at"],
  fault_photos: ["id", "fault_id", "storage_path", "uploaded_by", "created_at"],
}
const mustNotExist = { tables: ["maintenance_requests"], columns: { profiles: ["phone"] } }

const nameOf = (n) => (ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : n.getText())
const membersOf = (node) => {
  const map = new Map()
  if (node && ts.isTypeLiteralNode(node)) {
    for (const m of node.members) if (ts.isPropertySignature(m) && m.name) map.set(nameOf(m.name), m.type)
  }
  return map
}

if (text) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  let db
  sf.forEachChild((n) => {
    if (ts.isTypeAliasDeclaration(n) && n.name.text === "Database") db = n.type
  })
  const pub = membersOf(membersOf(db).get("public"))
  const tables = membersOf(pub.get("Tables"))
  const functions = membersOf(pub.get("Functions"))
  if (!db || tables.size === 0) problems.push("could not find Database.public.Tables in the file")

  for (const [table, expectedCols] of Object.entries(columns)) {
    const t = membersOf(tables.get(table))
    if (!tables.has(table)) { problems.push(`table "${table}" is missing`); continue }
    for (const kind of ["Row", "Insert", "Update"]) if (!t.has(kind)) problems.push(`${table} has no ${kind} type`)
    const row = membersOf(t.get("Row"))
    const missing = expectedCols.filter((c) => !row.has(c))
    const extra = [...row.keys()].filter((c) => !expectedCols.includes(c))
    if (missing.length) problems.push(`${table}.Row is missing: ${missing.join(", ")}`)
    if (extra.length) notes.push(`${table}.Row has columns this check does not know about: ${extra.join(", ")}`)
    for (const bad of mustNotExist.columns[table] ?? []) if (row.has(bad)) problems.push(`${table}.Row still has removed column "${bad}"`)
  }
  for (const t of mustNotExist.tables) if (tables.has(t)) problems.push(`old table "${t}" is still in the types: regenerate after the latest migration`)
  if (!functions.has("current_app_role")) problems.push("function current_app_role is missing from Database.public.Functions")

  const faults = membersOf(membersOf(tables.get("faults")).get("Row"))
  const plain = ["status", "priority", "category"].filter((c) => faults.get(c)?.getText() === "string")
  if (plain.length) notes.push(`faults.${plain.join(", ")} are plain strings (check constraints do not become unions): use the literal unions in types/fault.ts`)
}

console.log(`${file}: ${bytes.length} bytes`)
for (const n of notes) console.log(`note: ${n}`)
if (problems.length) {
  for (const p of problems) console.log(`FAIL: ${p}`)
  process.exit(1)
}
console.log("OK: valid UTF-8, no BOM, all five tables and the expected columns are present")
