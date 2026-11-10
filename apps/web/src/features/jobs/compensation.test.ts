import { expect, it } from "vitest";

import { compensationSummary } from "./compensation";
import { employmentLabel, workplaceLabel } from "./labels";

it("formats provider labels consistently without changing stored values", () => {
  expect(employmentLabel("FullTime")).toBe("Full Time");
  expect(employmentLabel("part-time")).toBe("Part Time");
  expect(workplaceLabel("on-site")).toBe("On-site");
  expect(workplaceLabel("remote")).toBe("Remote");
  expect(workplaceLabel("unknown")).toBe("Not specified");
});

it("prefers the complete employer compensation summary without a duplicate salary summary", () => {
  expect(
    compensationSummary({
      compensationTierSummary: "$80K–$100K · Equity",
      scrapeableCompensationSalarySummary: "$80K–$100K",
    }),
  ).toBe("$80K–$100K · Equity");
});

it("formats salary bounds, currencies, and periods without conversion", () => {
  expect(
    compensationSummary({
      range: { min: 80000, max: 100000, currency: "EUR", interval: "per-year-salary" },
    }),
  ).toBe("EUR 80,000–100,000 / year");
  expect(
    compensationSummary({ range: { min: 35.5, currency: "USD", interval: "per-hour-wage" } }),
  ).toBe("From USD 35.5 / hour");
  expect(compensationSummary({ range: { max: 5000, currency: "GBP", interval: "monthly" } })).toBe(
    "Up to GBP 5,000 / month",
  );
  expect(compensationSummary({ range: { min: 0, max: 0, currency: "USD" } })).toBe("USD 0");
});

it("keeps the salary range visible alongside the employer's pay note", () => {
  expect(
    compensationSummary({
      range: { min: 123000, max: 168000, currency: "USD", interval: "per-year-salary" },
      description: "Offers vary with experience and location.",
    }),
  ).toBe("USD 123,000–168,000 / year\nOffers vary with experience and location.");
  expect(compensationSummary({ description: "Includes equity." })).toBe("Includes equity.");
});

it("formats Ashby tiers and components when the top-level summary is absent", () => {
  expect(
    compensationSummary({
      compensationTiers: [
        {
          title: "US",
          components: [
            {
              compensationType: "Salary",
              minValue: 80000,
              maxValue: 100000,
              currencyCode: "USD",
              interval: "1 YEAR",
            },
            { summary: "Offers Bonus" },
          ],
        },
        { title: "Europe", tierSummary: "EUR 80,000–100,000" },
      ],
    }),
  ).toBe("US · USD 80,000–100,000 / year · Offers Bonus\nEurope · EUR 80,000–100,000");
  expect(
    compensationSummary({
      summaryComponents: [
        { compensationType: "EquityPercentage", minValue: 0.5, maxValue: 1.75, interval: "NONE" },
      ],
    }),
  ).toBe("0.5–1.75% equity");
});

it("does not expose raw JSON or invent amounts for unsupported compensation", () => {
  expect(compensationSummary({ futureField: { privateId: "opaque" } })).toBeNull();
  expect(compensationSummary({ range: { min: null, max: null } })).toBeNull();
  expect(compensationSummary(null)).toBeNull();
});
