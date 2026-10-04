// src/lib/adapters/constants.ts

export const VALID_PLATFORM_TYPES = [
  "unit3d",
  "gazelle",
  "ggn",
  "nebulance",
  "mam",
  "avistaz",
  "digitalcore",
  "filelist",
  "custom",
  "btn",
  "iptorrents",
  "torrentleech",
  "hawke",
  "animebytes",
  "luminance",
  "tr4ker",
  "c411",
  "yggreborn",
  "v3x",
] as const
export type PlatformType = (typeof VALID_PLATFORM_TYPES)[number]

export const MAM_BONUS_CAP = 99999

export const DEFAULT_API_PATHS: Record<string, string> = {
  unit3d: "/api/user",
  gazelle: "/ajax.php",
  ggn: "/api.php",
  nebulance: "/api.php",
  mam: "/jsonLoad.php",
  avistaz: "/profile",
  digitalcore: "/api/v1/status",
  filelist: "/userdetails.php",
  btn: "/",
  iptorrents: "/profile",
  torrentleech: "/profile",
  hawke: "/api/profile",
  animebytes: "/api/stats/personal",
  luminance: "/user.php",
  tr4ker: "/api/me",
  c411: "/api/auth/me",
  yggreborn: "/account/",
  v3x: "/auth/me",
}
