// src/lib/adapters/v3x.ts
//
// V3X (v3x.club) is a custom Next.js site with its JSON API on api.v3x.club.
// Its scoped API keys only cover torznab/upload/drafts, so personal stats come
// from GET https://api.v3x.club/auth/me with a session cookie.
//
// Two ways to authenticate, chosen from what is pasted in the token field:
//   1. Session cookie (the "Cookie" header copied from api.v3x.club). Expires.
//   2. Login JSON: {"login":"pseudo","password":"…"} (optional "totpSecret" if
//      2FA is enabled). The adapter logs in by itself, keeps the session cookie
//      in memory and only logs in again when it expires. V3X has no captcha.

import { createHmac } from "node:crypto"
import { computeBufferBytes, computeRatio } from "@/lib/data-transforms"
import { classifyFetchError } from "@/lib/error-utils"
import { ADAPTER_FETCH_TIMEOUT_MS } from "@/lib/limits"
import { proxyFetch } from "@/lib/tunnel"
import { adapterFetch } from "./adapter-fetch"
import type { DebugApiCall, FetchOptions, TrackerAdapter, TrackerStats } from "./types"

const API = "https://api.v3x.club"
const HOST = "api.v3x.club"

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

interface V3xLogin {
  login: string
  password: string
  totpSecret?: string
}

const toBig = (n: unknown): bigint =>
  typeof n === "number" && Number.isFinite(n) ? BigInt(Math.round(n)) : 0n

function cookieHeader(token: string): string {
  const v = token.trim().replace(/^cookie:\s*/i, "")
  if (!v || /[\r\n]/.test(v)) throw new Error("V3X: paste the Cookie header value on a single line")
  return v
}

function parseLogin(token: string): V3xLogin | null {
  const t = token.trim()
  if (!t.startsWith("{")) return null
  let o: Record<string, unknown>
  try {
    o = JSON.parse(t)
  } catch {
    throw new Error('V3X: invalid JSON, expected {"login":"…","password":"…"}')
  }
  const login = String(o.login ?? o.username ?? "").trim()
  const password = typeof o.password === "string" ? o.password : ""
  if (!login || !password) throw new Error('V3X: JSON needs "login" and "password"')
  const totp = typeof o.totpSecret === "string" ? o.totpSecret.replace(/\s+/g, "") : ""
  return { login, password, ...(totp ? { totpSecret: totp } : {}) }
}

// RFC 6238 TOTP (SHA1, 30 s, 6 digits) from a base32 secret.
function totp(secret: string): string {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  for (const c of secret.toUpperCase().replace(/=+$/, "")) {
    const i = alpha.indexOf(c)
    if (i < 0) throw new Error("V3X: totpSecret must be base32")
    bits += i.toString(2).padStart(5, "0")
  }
  const key = Buffer.from(bits.match(/.{8}/g)?.map((b) => parseInt(b, 2)) ?? [])
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)))
  const h = createHmac("sha1", key).update(counter).digest()
  const off = h[h.length - 1] & 0xf
  const code = (h.readUInt32BE(off) & 0x7fffffff) % 1_000_000
  return code.toString().padStart(6, "0")
}

// --- session cache (one login per expiry, not per poll) ----------------------
const g = globalThis as typeof globalThis & { __v3xSessions?: Map<string, string> }
if (!g.__v3xSessions) g.__v3xSessions = new Map()
const sessions = g.__v3xSessions

function mergeCookies(base: string, setCookies: string[]): string {
  const jar = new Map<string, string>()
  for (const pair of base.split(";").map((p) => p.trim()).filter(Boolean)) {
    const [k, ...v] = pair.split("=")
    jar.set(k, v.join("="))
  }
  for (const raw of setCookies) {
    const pair = raw.split(";")[0]?.trim()
    if (!pair) continue
    const [k, ...v] = pair.split("=")
    jar.set(k, v.join("="))
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ")
}

async function postJson(
  path: string,
  payload: unknown,
  cookies: string,
  options?: FetchOptions
): Promise<{ status: number; setCookies: string[]; body: Record<string, unknown> }> {
  const url = `${API}${path}`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Origin: "https://v3x.club",
    Referer: "https://v3x.club/login",
    "User-Agent": "Mozilla/5.0 (tracker-tracker)",
    ...(cookies ? { Cookie: cookies } : {}),
  }
  const body = JSON.stringify(payload)
  try {
    if (options?.proxyAgent) {
      const res = await proxyFetch(url, options.proxyAgent, {
        method: "POST",
        body,
        headers,
        timeoutMs: ADAPTER_FETCH_TIMEOUT_MS,
      })
      const raw = res.headers["set-cookie"]
      const text = await res.text()
      return {
        status: res.status,
        setCookies: Array.isArray(raw) ? raw : raw ? [raw] : [],
        body: text ? JSON.parse(text) : {},
      }
    }
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(ADAPTER_FETCH_TIMEOUT_MS),
    })
    const text = await res.text()
    let parsed: Record<string, unknown> = {}
    try {
      parsed = text ? JSON.parse(text) : {}
    } catch {
      parsed = {}
    }
    return { status: res.status, setCookies: res.headers.getSetCookie?.() ?? [], body: parsed }
  } catch (err) {
    throw classifyFetchError(err, HOST)
  }
}

async function login(creds: V3xLogin, options?: FetchOptions): Promise<string> {
  const first = await postJson("/auth/login", { login: creds.login, password: creds.password, remember: true }, "", options)
  let cookies = mergeCookies("", first.setCookies)
  if (first.status >= 400) {
    const code = String(first.body.code ?? first.body.error ?? first.status)
    throw new Error(`V3X: login refused (${code}), check login/password`)
  }
  if (first.body.twoFactorRequired && first.body.challenge) {
    if (!creds.totpSecret) {
      throw new Error('V3X: 2FA is enabled on this account, add "totpSecret" to the JSON or use a session cookie')
    }
    const second = await postJson("/auth/2fa", { challenge: first.body.challenge, code: totp(creds.totpSecret) }, cookies, options)
    if (second.status >= 400) throw new Error(`V3X: 2FA refused (${String(second.body.code ?? second.status)})`)
    cookies = mergeCookies(cookies, second.setCookies)
  }
  if (!cookies) throw new Error("V3X: login succeeded but no session cookie was returned")
  return cookies
}

async function fetchMe(apiToken: string, apiPath: string, options?: FetchOptions): Promise<V3xMe> {
  const url = new URL(apiPath, API).toString()
  const creds = parseLogin(apiToken)
  if (!creds) {
    const me = await adapterFetch<V3xMe>(url, HOST, options, { Cookie: cookieHeader(apiToken) })
    if (!me?.username) throw new Error("V3X: session cookie expired or invalid, paste a fresh one")
    return me
  }
  const key = creds.login.toLowerCase()
  for (let attempt = 0; attempt < 2; attempt++) {
    let cookies = sessions.get(key)
    if (!cookies) {
      cookies = await login(creds, options)
      sessions.set(key, cookies)
    }
    try {
      const me = await adapterFetch<V3xMe>(url, HOST, options, { Cookie: cookies })
      if (me?.username) return me
    } catch (err) {
      if (attempt === 1) throw err
    }
    sessions.delete(key) // session expired: log in again once
  }
  throw new Error("V3X: could not get stats after logging in")
}

export class V3xAdapter implements TrackerAdapter {
  async fetchStats(
    _baseUrl: string,
    apiToken: string,
    apiPath: string,
    options?: FetchOptions
  ): Promise<TrackerStats> {
    const me = await fetchMe(apiToken, apiPath, options)
    const uploadedBytes = toBig(me.uploaded)
    const downloadedBytes = toBig(me.downloaded)
    return {
      username: me.username ?? "",
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
    try {
      const data = { ...(await fetchMe(apiToken, apiPath, options)) } as Record<string, unknown>
      delete data.email
      return [{ label: "Auth me", endpoint: apiPath, data, error: null }]
    } catch (err) {
      return [{ label: "Auth me", endpoint: apiPath, data: null, error: err instanceof Error ? err.message : "Request failed" }]
    }
  }
}
