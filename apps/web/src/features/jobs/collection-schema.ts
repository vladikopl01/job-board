import {
  filtersFor,
  sortsFor,
  type CollectionFilterItem,
} from "@/components/collection/query-schema";
import { countryOptions, regionOptions, departmentOptions } from "@job-board/job-boards";

const discoveryValues = new Map([
  ["country", new Set(countryOptions.map((option) => option.value))],
  ["region", new Set(regionOptions.map((option) => option.value))],
  ["department", new Set(departmentOptions.map((option) => option.value))],
]);

export function availabilityFilter(value: "open" | "history"): CollectionFilterItem {
  return {
    id: "availability",
    filterId: "job-availability",
    variant: "select",
    operator: "eq",
    value,
  };
}

export const jobFiltersSchema = filtersFor({
  title: "text",
  company: "text",
  boardId: "select",
  provider: "select",
  locations: "text",
  country: "select",
  region: "select",
  department: "select",
  workplaceType: "select",
  readStatus: "select",
  availability: "select",
}).refine(
  (filters) =>
    filters.every((filter) => {
      const allowed = discoveryValues.get(filter.id);
      if (!allowed) return true;
      const values = Array.isArray(filter.value) ? filter.value : [filter.value];
      return values.every((value) => value === "" || allowed.has(value));
    }),
  "Unsupported discovery value.",
);
export const jobSortsSchema = sortsFor([
  "title",
  "company",
  "provider",
  "workplaceType",
  "firstSeenAt",
]);
