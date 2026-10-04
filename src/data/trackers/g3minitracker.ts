// src/data/trackers/g3minitracker.ts
import type { TrackerRegistryEntry } from "@/data/tracker-registry"

export const g3minitracker: TrackerRegistryEntry = {
  slug: "g3minitracker",
  name: "G3mini TR4CK3R",
  abbreviation: "G3M",
  url: "https://gemini-tracker.org",
  description: "French-language private tracker (UNIT3D).",
  platform: "unit3d",
  apiPath: "/api/user",
  specialty: "General / French content",
  contentCategories: ["Movies", "TV"],
  language: "French",
  color: "#fdcb6e",
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
