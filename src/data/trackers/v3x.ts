// src/data/trackers/v3x.ts
import type { TrackerRegistryEntry } from "@/data/tracker-registry"

export const v3x: TrackerRegistryEntry = {
  slug: "v3x",
  name: "V3X",
  abbreviation: "V3X",
  url: "https://v3x.club",
  description: "French-language private tracker (custom Next.js platform).",
  platform: "v3x",
  apiPath: "/auth/me",
  specialty: "General / French content",
  contentCategories: ["Movies", "TV"],
  language: "French",
  color: "#6c5ce7",
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
