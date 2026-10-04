// src/data/trackers/c411.ts
import type { TrackerRegistryEntry } from "@/data/tracker-registry"

export const c411: TrackerRegistryEntry = {
  slug: "c411",
  name: "C411",
  abbreviation: "C411",
  url: "https://c411.org",
  description: "French-language private tracker (UNIT3D).",
  platform: "c411",
  apiPath: "/api/auth/me",
  specialty: "General / French content",
  contentCategories: ["Movies", "TV"],
  language: "French",
  color: "#00b894",
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
