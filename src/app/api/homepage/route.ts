// src/app/api/homepage/route.ts
//
// Read-only summary for the gethomepage "customapi" widget.
// Public route (see src/proxy.ts) guarded by HOMEPAGE_TOKEN, sent either as the
// X-Homepage-Token header or ?token= query param. Exposes stats only, never
// credentials.

import { timingSafeEqual } from "node:crypto"
import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { findRegistryEntry } from "@/data/tracker-registry"
import { db } from "@/lib/db"
import { trackerSnapshots, trackers } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

function authorized(req: Request): boolean {
  const expected = process.env.HOMEPAGE_TOKEN
  if (!expected) return false
  const url = new URL(req.url)
  const given = req.headers.get("x-homepage-token") ?? url.searchParams.get("token") ?? ""
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

const num = (v: bigint | null | undefined) => (v === null || v === undefined ? null : Number(v))

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db.select().from(trackers).where(eq(trackers.isActive, true))
  const list = []
  const bySlug: Record<string, unknown> = {}
  let totalUp = 0
  let totalDown = 0

  for (const t of rows) {
    const [snap] = await db
      .select()
      .from(trackerSnapshots)
      .where(eq(trackerSnapshots.trackerId, t.id))
      .orderBy(desc(trackerSnapshots.polledAt))
      .limit(1)
    const slug = findRegistryEntry(t.baseUrl)?.slug ?? `tracker-${t.id}`
    const item = {
      id: t.id,
      slug,
      name: t.name,
      ratio: snap?.ratio !== null && snap?.ratio !== undefined ? Math.round(snap.ratio * 100) / 100 : null,
      uploaded: num(snap?.uploadedBytes),
      downloaded: num(snap?.downloadedBytes),
      buffer: num(snap?.bufferBytes),
      seedbonus: snap?.seedbonus ?? null,
      requiredRatio: snap?.requiredRatio ?? null,
      status: t.lastError ? "erreur" : "ok",
      lastError: t.lastError ?? null,
      polledAt: snap?.polledAt ?? null,
    }
    totalUp += item.uploaded ?? 0
    totalDown += item.downloaded ?? 0
    list.push(item)
    bySlug[slug] = item
  }

  list.sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))

  return NextResponse.json({
    count: list.length,
    errors: list.filter((t) => t.status !== "ok").length,
    totals: {
      uploaded: totalUp,
      downloaded: totalDown,
      buffer: totalUp - totalDown,
      ratio: totalDown > 0 ? Math.round((totalUp / totalDown) * 100) / 100 : null,
    },
    trackers: list,
    bySlug,
  })
}
