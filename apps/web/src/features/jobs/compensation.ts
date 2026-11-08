import type { JsonValue } from "@job-board/job-boards";
import { z } from "zod";

const text = z.string().trim().nullish();
const amount = z.number().finite().nullish();
const componentSchema = z.object({
  summary: text,
  compensationType: text,
  interval: text,
  currencyCode: text,
  minValue: amount,
  maxValue: amount,
});
const compensationSchema = z.object({
  compensationTierSummary: text,
  scrapeableCompensationSalarySummary: text,
  description: text,
  range: z.object({ min: amount, max: amount, currency: text, interval: text }).nullish(),
  compensationTiers: z
    .array(
      z.object({ title: text, tierSummary: text, components: z.array(componentSchema).nullish() }),
    )
    .nullish(),
  summaryComponents: z.array(componentSchema).nullish(),
});
const numbers = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });
const periods: Record<string, string> = {
  "1 year": "year",
  "per-year-salary": "year",
  yearly: "year",
  annually: "year",
  annual: "year",
  year: "year",
  "1 month": "month",
  "per-month-salary": "month",
  monthly: "month",
  month: "month",
  "1 week": "week",
  "per-week-salary": "week",
  weekly: "week",
  week: "week",
  "1 day": "day",
  "per-day-wage": "day",
  daily: "day",
  day: "day",
  "1 hour": "hour",
  "per-hour-wage": "hour",
  hourly: "hour",
  hour: "hour",
};

function rangeSummary({
  min,
  max,
  currency,
  interval,
  percentage = false,
}: {
  min?: number | null | undefined;
  max?: number | null | undefined;
  currency?: string | null | undefined;
  interval?: string | null | undefined;
  percentage?: boolean;
}) {
  if (min == null && max == null) return null;
  const bounds =
    min != null && max != null
      ? min === max
        ? numbers.format(min)
        : `${numbers.format(min)}–${numbers.format(max)}`
      : numbers.format(min ?? max ?? 0);
  const prefix = min == null ? "Up to " : max == null ? "From " : "";
  const period = interval ? periods[interval.toLowerCase()] : undefined;
  const cadence = period
    ? ` / ${period}`
    : interval && interval.toLowerCase() !== "none"
      ? ` · ${interval}`
      : "";
  return `${prefix}${currency ? `${currency} ` : ""}${bounds}${percentage ? "% equity" : ""}${cadence}`;
}

function componentSummary(component: z.infer<typeof componentSchema>) {
  return (
    component.summary ||
    rangeSummary({
      min: component.minValue,
      max: component.maxValue,
      currency: component.currencyCode,
      interval: component.interval,
      percentage: component.compensationType === "EquityPercentage",
    })
  );
}

export function compensationSummary(value: JsonValue): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return numbers.format(value);
  const result = compensationSchema.safeParse(value);
  if (!result.success) return null;
  const compensation = result.data;
  const summary =
    compensation.compensationTierSummary ||
    compensation.scrapeableCompensationSalarySummary ||
    compensation.description;
  if (summary) return summary;
  const tiers = (compensation.compensationTiers ?? []).flatMap((tier) => {
    const detail =
      tier.tierSummary || (tier.components ?? []).map(componentSummary).filter(Boolean).join(" · ");
    return detail ? [[tier.title, detail].filter(Boolean).join(" · ")] : [];
  });
  if (tiers.length) return tiers.join("\n");
  const components = (compensation.summaryComponents ?? []).map(componentSummary).filter(Boolean);
  if (components.length) return components.join(" · ");
  return compensation.range ? rangeSummary(compensation.range) : null;
}
