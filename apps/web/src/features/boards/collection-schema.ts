import { filtersFor, sortsFor } from "@/components/collection/query-schema";

export const boardFiltersSchema = filtersFor({
  displayName: "text",
  provider: "select",
  canonicalUrl: "text",
  status: "select",
});
export const boardSortsSchema = sortsFor([
  "displayName",
  "provider",
  "lastSuccessfulRefreshAt",
  "createdAt",
]);
