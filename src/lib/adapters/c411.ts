// src/lib/adapters/c411.ts
//
// C411 (c411.org) runs a custom Nuxt stack. Its scoped API keys only cover
// Torznab/upload/drafts, so personal stats are only reachable through
// /api/auth/me with the browser session cookie. The token field therefore
// holds the raw `Cookie` header value copied from the browser.

import { computeBufferBytes, computeRatio } from "@/lib/data-transforms"
import { adapterFetch } from "./adapter-fetch"
import type { DebugApiCall, FetchOptions, TrackerAdapter, TrackerStats } from "./types"

interface C411Me {
  authenticated?: boolean
  user?: {
    username: string
    roles?: unknown
    uploaded?: number
    downloaded?: number
    ratio?: number
    isWarned?: boolean
    warnings?: number
    minRatioForDownload?: number
    createdAt?: string
  } | null
}

const toBig = (n: unknown): bigint =>
  typeof n === "number" && Number.isFinite(n) ? BigInt(Math.round(n)) : 0n

function cookieHeader(token: string): string {
  const v = token.trim().replace(/^cookie:\s*/i, "")
  if (!v || /[\r\n]/.test(v)) throw new Error("C411: paste the Cookie header value on a single line")
  return v
}

function firstRole(roles: unknown): string {
  if (Array.isArray(roles)) {
    for (const r of roles) {
      if (typeof r === "string" && r) return r
      if (r && typeof r === "object" && typeof (r as { name?: unknown }).name === "string") {
        return (r as { name: string }).name
      }
    }
  }
  return "Membre"
}

export class C411Adapter implements TrackerAdapter {
  async fetchStats(
    baseUrl: string,
    apiToken: string,
    apiPath: string,
    options?: FetchOptions
  ): Promise<TrackerStats> {
    const hostname = new URL(baseUrl).hostname
    const url = new URL(apiPath, baseUrl).toString()
    const body = await adapterFetch<C411Me>(url, hostname, options, { Cookie: cookieHeader(apiToken) })
    const u = body?.user
    if (!body?.authenticated || !u) {
      throw new Error("C411: session cookie expired or invalid, paste a fresh one")
    }

    const uploadedBytes = toBig(u.uploaded)
    const downloadedBytes = toBig(u.downloaded)

    return {
      username: u.username,
      group: firstRole(u.roles),
      uploadedBytes,
      downloadedBytes,
      ratio:
        typeof u.ratio === "number" && Number.isFinite(u.ratio)
          ? u.ratio
          : computeRatio(uploadedBytes, downloadedBytes),
      bufferBytes: computeBufferBytes(uploadedBytes, downloadedBytes),
      seedingCount: null,
      leechingCount: null,
      seedbonus: null,
      hitAndRuns: null,
      requiredRatio: typeof u.minRatioForDownload === "number" ? u.minRatioForDownload : null,
      warned: typeof u.isWarned === "boolean" ? u.isWarned : null,
      freeleechTokens: null,
      joinedDate: u.createdAt || undefined,
    }
  }

  async fetchRaw(
    baseUrl: string,
    apiToken: string,
    apiPath: string,
    options?: FetchOptions
  ): Promise<DebugApiCall[]> {
    const hostname = new URL(baseUrl).hostname
    const url = new URL(apiPath, baseUrl).toString()
    try {
      const data = await adapterFetch<Record<string, unknown>>(url, hostname, options, {
        Cookie: cookieHeader(apiToken),
      })
      const user = data.user as Record<string, unknown> | null
      if (user) delete user.email
      return [{ label: "Auth me", endpoint: apiPath, data, error: null }]
    } catch (err) {
      return [{ label: "Auth me", endpoint: apiPath, data: null, error: err instanceof Error ? err.message : "Request failed" }]
    }
  }
}
