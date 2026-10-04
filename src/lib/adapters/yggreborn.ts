// src/lib/adapters/yggreborn.ts
//
// YGG Reborn has no personal-stats API (its /api is Torznab only). The account
// page (/account/) is server-rendered, so stats are scraped from its HTML using
// the browser session cookie pasted into the token field.
//
// Markup (verified 2026-09): <div ...>361.61 Go</div><div ...>Upload</div>

import { computeBufferBytes, computeRatio } from "@/lib/data-transforms"
import { adapterRequest } from "./adapter-fetch"
import type { DebugApiCall, FetchOptions, TrackerAdapter, TrackerStats } from "./types"

const UNIT_POWER: Record<string, number> = { "": 0, K: 1, M: 2, G: 3, T: 4, P: 5 }

function parseSize(raw: string): bigint {
  const m = raw.trim().match(/^([\d\s.,]+)\s*([KMGTP]?)(?:i?[oB])$/i)
  if (!m) throw new Error(`YGG Reborn: unrecognised size "${raw}"`)
  const value = Number.parseFloat(m[1].replace(/\s/g, "").replace(",", "."))
  const power = UNIT_POWER[m[2].toUpperCase()] ?? 0
  return BigInt(Math.round(value * 1024 ** power))
}

function statBefore(html: string, label: string): string | null {
  const re = new RegExp(`>\\s*([^<>]{1,40}?)\\s*</div>\\s*<div[^>]*>\\s*${label}\\s*</div>`, "i")
  return html.match(re)?.[1] ?? null
}

function cookieHeader(token: string): string {
  const v = token.trim().replace(/^cookie:\s*/i, "")
  if (!v || /[\r\n]/.test(v)) throw new Error("YGG Reborn: paste the Cookie header value on a single line")
  return v
}

async function fetchAccountHtml(baseUrl: string, apiToken: string, apiPath: string, options?: FetchOptions) {
  const hostname = new URL(baseUrl).hostname
  const url = new URL(apiPath, baseUrl).toString()
  const res = await adapterRequest(url, hostname, options, {
    Accept: "text/html,application/xhtml+xml",
    Cookie: cookieHeader(apiToken),
  })
  if (!res.ok) throw new Error(`Tracker error: ${res.status} ${res.statusText}`)
  return res.text()
}

export class YggRebornAdapter implements TrackerAdapter {
  async fetchStats(
    baseUrl: string,
    apiToken: string,
    apiPath: string,
    options?: FetchOptions
  ): Promise<TrackerStats> {
    const html = await fetchAccountHtml(baseUrl, apiToken, apiPath, options)

    const up = statBefore(html, "Upload")
    const down = statBefore(html, "Download")
    if (!up || !down) {
      throw new Error("YGG Reborn: stats not found, session cookie probably expired, paste a fresh one")
    }
    const uploadedBytes = parseSize(up)
    const downloadedBytes = parseSize(down)

    const ratioRaw = statBefore(html, "Ratio")
    const ratioNum = ratioRaw ? Number.parseFloat(ratioRaw.replace(/\s/g, "").replace(",", ".")) : Number.NaN

    const username =
      html.match(/Bienvenue,\s*(?:<[^>]+>\s*)*([^<\s]+)/i)?.[1] ??
      html.match(/Nom d'utilisateur\s*<\/[^>]+>\s*(?:<[^>]+>\s*)*([^<\s]+)/i)?.[1] ??
      "unknown"

    return {
      username,
      group: "Membre",
      uploadedBytes,
      downloadedBytes,
      ratio: Number.isFinite(ratioNum) ? ratioNum : computeRatio(uploadedBytes, downloadedBytes),
      bufferBytes: computeBufferBytes(uploadedBytes, downloadedBytes),
      seedingCount: null,
      leechingCount: null,
      seedbonus: null,
      hitAndRuns: null,
      requiredRatio: null,
      warned: null,
      freeleechTokens: null,
    }
  }

  async fetchRaw(
    baseUrl: string,
    apiToken: string,
    apiPath: string,
    options?: FetchOptions
  ): Promise<DebugApiCall[]> {
    try {
      const html = await fetchAccountHtml(baseUrl, apiToken, apiPath, options)
      const data = {
        upload: statBefore(html, "Upload"),
        download: statBefore(html, "Download"),
        freeleechDl: statBefore(html, "Freeleech DL"),
        ratio: statBefore(html, "Ratio"),
      }
      return [{ label: "Account page", endpoint: apiPath, data, error: null }]
    } catch (err) {
      return [{ label: "Account page", endpoint: apiPath, data: null, error: err instanceof Error ? err.message : "Request failed" }]
    }
  }
}
