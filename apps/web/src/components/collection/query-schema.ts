import { z } from "zod";

export const collectionFilterSchema = z.strictObject({
  id: z.string().min(1).max(50),
  filterId: z.string().min(1).max(80),
  variant: z.enum(["text", "select"]),
  operator: z.enum(["iLike", "notILike", "eq", "ne", "isEmpty", "isNotEmpty"]),
  value: z.union([z.string().max(200), z.array(z.string().max(200)).max(20)]),
  disabled: z.boolean().optional(),
});
export const collectionFiltersSchema = z
  .array(collectionFilterSchema)
  .max(12)
  .refine(
    (filters) => new Set(filters.map((filter) => filter.filterId)).size === filters.length,
    "Filter identifiers must be unique.",
  );
export const collectionSortsSchema = z
  .array(
    z.strictObject({
      id: z.string().min(1).max(50),
      desc: z.boolean(),
    }),
  )
  .max(5)
  .refine(
    (sorts) => new Set(sorts.map((sort) => sort.id)).size === sorts.length,
    "Sort fields must be unique.",
  );
export const joinOperatorSchema = z.enum(["and", "or"]);
export type CollectionFilterItem = z.infer<typeof collectionFilterSchema>;
export type CollectionSort = z.infer<typeof collectionSortsSchema>[number];

export function jsonQuery<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, schema);
}

export function isActiveFilter(filter: CollectionFilterItem) {
  return (
    !filter.disabled &&
    (filter.operator === "isEmpty" ||
      filter.operator === "isNotEmpty" ||
      (Array.isArray(filter.value) ? filter.value.some(Boolean) : Boolean(filter.value)))
  );
}

// Both the API and the controls accept only operators that make sense for the field.
export function filtersFor(fields: Record<string, "text" | "select">) {
  return collectionFiltersSchema.refine(
    (filters) =>
      filters.every(
        (filter) =>
          fields[filter.id] === filter.variant &&
          (filter.variant === "text"
            ? typeof filter.value === "string"
            : ["eq", "ne", "isEmpty", "isNotEmpty"].includes(filter.operator)),
      ),
    "Unsupported filter field or operator.",
  );
}

export function sortsFor(fields: string[]) {
  return collectionSortsSchema.refine(
    (sorts) => sorts.every((sort) => fields.includes(sort.id)),
    "Unsupported sort field.",
  );
}
