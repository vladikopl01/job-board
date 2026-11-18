import type { JobListItem } from "./schemas";

const workplaceLabels = {
  remote: "Remote",
  hybrid: "Hybrid",
  "on-site": "On-site",
  unknown: "Not specified",
} satisfies Record<JobListItem["workplaceType"], string>;

export function workplaceLabel(value: JobListItem["workplaceType"]) {
  return workplaceLabels[value];
}

export function locationSummary(locations: JobListItem["locations"], limit = 2) {
  const remaining = Math.max(0, locations.length - limit);
  return [
    ...locations.slice(0, limit).map((location) => location.text),
    ...(remaining > 0 ? [`${remaining} more location${remaining === 1 ? "" : "s"}`] : []),
  ].join(", ");
}

export function employmentLabel(value: string) {
  const words = value
    .trim()
    .replace(/([a-z])([A-Z])/gu, "$1 $2")
    .replace(/[-_]+/gu, " ")
    .replace(/\s+/gu, " ");
  return words.replace(
    /\b\p{L}+/gu,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}
