// src/data/trackers/tr4ker.ts
import type { TrackerRegistryEntry } from "@/data/tracker-registry"

export const tr4ker: TrackerRegistryEntry = {
  slug: "tr4ker",
  name: "TR4KER",
  abbreviation: "TR4K",
  url: "https://tr4ker.net",
  description: "French-language private tracker (UNIT3D).",
  platform: "tr4ker",
  apiPath: "/api/me",
  specialty: "General / French content",
  contentCategories: ["Movies", "TV"],
  language: "French",
  color: "#e84393",
  logo: "",
  trackerHubSlug: "",
  statusPageUrl: "",
  userClasses: [],
  releaseGroups: [],
  bannedGroups: [],
  notableMembers: [],
  rules: {
    minimumRatio: 0,
    seedTimeHours: 0,
    loginIntervalDays: 0,
  },
  warning: false,
  warningNote: "",
  draft: false,
  supportsTransitPapers: false,
  profileUrlPattern: "",
}
