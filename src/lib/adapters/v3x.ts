// src/lib/adapters/v3x.ts
//
// V3X (v3x.club) is a custom Next.js site with its JSON API on api.v3x.club.
// Its scoped API keys only cover torznab/upload/drafts, so personal stats come
// from GET https://api.v3x.club/auth/me with the browser session cookie
// (exported from api.v3x.club) pasted into the token field.

import { computeBufferBytes, computeRatio } from "@/lib/data-transforms"
import { adapterFetch } from "./adapter-fetch"
import type { DebugApiCall, FetchOptions, TrackerAdapter, TrackerStats } from "./types"

const API = "https://api.v3x.club"

interface V3xMe {
  username?: string
  role?: string
  uploaded?: number
  downloaded?: number
  bonusPoints?: number
  freeleechTokens?: number
  seedTimeSeconds?: number
  error?: string
}

const toBig = (n: unknown): bigint =>
  typeof n === "number" && Number.isFinite(n) ? BigInt(Math.round(n)) : 0n

function cookieHeader(token: string): string {
  const v = token.trim().replace(/^cookie:\s*/i, "")
  if (!v || /[\r\n]/.test(v)) throw new Error("V3X: paste the Cookie header value on a single line")
  return v
}

export class V3xAdapter implements TrackerAdapter {
  async fetchStats(
    _baseUrl: string,
    apiToken: string,
    apiPath: string,
    options?: FetchOptions
  ): Promise<TrackerStats> {
    const url = new URL(apiPath, API).toString()
    const me = await adapterFetch<V3xMe>(url, "api.v3x.club", options, { Cookie: cookieHeader(apiToken) })
    if (!me?.username) throw new Error("V3X: session cookie expired or invalid, paste a fresh one")

    const uploadedBytes = toBig(me.uploaded)
    const downloadedBytes = toBig(me.downloaded)
    return {
      username: me.username,
      group: me.role ?? "user",
      uploadedBytes,
      downloadedBytes,
      ratio: computeRatio(uploadedBytes, downloadedBytes),
      bufferBytes: computeBufferBytes(uploadedBytes, downloadedBytes),
      seedingCount: null,
      leechingCount: null,
      seedbonus: typeof me.bonusPoints === "number" ? me.bonusPoints : null,
      hitAndRuns: null,
      requiredRatio: null,
      warned: null,
      freeleechTokens: typeof me.freeleechTokens === "number" ? me.freeleechTokens : null,
    }
  }

  async fetchRaw(
    _baseUrl: string,
    apiToken: string,
    apiPath: string,
    options?: FetchOptions
  ): Promise<DebugApiCall[]> {
    const url = new URL(apiPath, API).toString()
    try {
      const data = await adapterFetch<Record<string, unknown>>(url, "api.v3x.club", options, { Cookie: cookieHeader(apiToken) })
      delete data.email
      return [{ label: "Auth me", endpoint: apiPath, data, error: null }]
    } catch (err) {
      return [{ label: "Auth me", endpoint: apiPath, data: null, error: err instanceof Error ? err.message : "Request failed" }]
    }
  }
}
