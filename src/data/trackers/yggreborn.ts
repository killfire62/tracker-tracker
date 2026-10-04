// src/data/trackers/yggreborn.ts
import type { TrackerRegistryEntry } from "@/data/tracker-registry"

export const yggreborn: TrackerRegistryEntry = {
  slug: "yggreborn",
  name: "YGG Reborn",
  abbreviation: "YGG",
  url: "https://www.yggreborn.org",
  description: "French-language private tracker (UNIT3D).",
  platform: "yggreborn",
  apiPath: "/account/",
  specialty: "General / French content",
  contentCategories: ["Movies", "TV"],
  language: "French",
  color: "#0984e3",
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
