// src/lib/adapters/tr4ker.ts
//
// TR4KER (tr4ker.net) is a bespoke React SPA, not UNIT3D. Its JSON API lives at
// /api/me and authenticates with an `X-Api-Key` header (key shown in
// Mon compte -> Paramètres -> Clé API). Bonus upload/download are reported
// separately and must be added to reach the figures the site displays.

import { computeBufferBytes, computeRatio } from "@/lib/data-transforms"
import { adapterFetch } from "./adapter-fetch"
import type { DebugApiCall, FetchOptions, TrackerAdapter, TrackerStats } from "./types"

interface Tr4kerMe {
  username: string
  role?: string
  uploaded?: number
  downloaded?: number
  bonus_upload?: number
  bonus_download?: number
  money?: number
  joined_at?: string
  last_seen_at?: string
}

const toBig = (n: unknown): bigint =>
  typeof n === "number" && Number.isFinite(n) ? BigInt(Math.round(n)) : 0n

export class Tr4kerAdapter implements TrackerAdapter {
  async fetchStats(
    baseUrl: string,
    apiToken: string,
    apiPath: string,
    options?: FetchOptions
  ): Promise<TrackerStats> {
    const hostname = new URL(baseUrl).hostname
    const url = new URL(apiPath, baseUrl).toString()
    const me = await adapterFetch<Tr4kerMe>(url, hostname, options, {
      "X-Api-Key": apiToken.trim(),
    })
    if (!me?.username) throw new Error(`Unexpected response from ${hostname}: no username`)

    const uploadedBytes = toBig(me.uploaded) + toBig(me.bonus_upload)
    const downloadedBytes = toBig(me.downloaded) + toBig(me.bonus_download)

    return {
      username: me.username,
      group: me.role ?? "user",
      uploadedBytes,
      downloadedBytes,
      ratio: computeRatio(uploadedBytes, downloadedBytes),
      bufferBytes: computeBufferBytes(uploadedBytes, downloadedBytes),
      seedingCount: null,
      leechingCount: null,
      seedbonus: typeof me.money === "number" ? me.money : null,
      hitAndRuns: null,
      requiredRatio: null,
      warned: null,
      freeleechTokens: null,
      joinedDate: me.joined_at || undefined,
      lastAccessDate: me.last_seen_at || undefined,
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
        "X-Api-Key": apiToken.trim(),
      })
      // Never echo secrets back into the debug view.
      delete data.api_key
      delete data.passkey
      return [{ label: "Me", endpoint: apiPath, data, error: null }]
    } catch (err) {
      return [{ label: "Me", endpoint: apiPath, data: null, error: err instanceof Error ? err.message : "Request failed" }]
    }
  }
}
