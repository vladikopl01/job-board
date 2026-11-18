import { expect, it } from "vitest";

import { companyNameFromSlug } from "../src/index.ts";

it.each([
  ["notion", "Notion"],
  ["MoonPay", "MoonPay"],
  ["Hyperliquid Labs", "Hyperliquid Labs"],
  ["acme-inc_ai.studio", "Acme Inc Ai Studio"],
  ["___", "___"],
  ["a".repeat(130), `A${"a".repeat(119)}`],
])("suggests a valid local label for slug %s", (boardKey, expected) => {
  expect(
    companyNameFromSlug({
      provider: "ashby",
      sourceHost: "jobs.ashbyhq.com",
      canonicalUrl: `https://jobs.ashbyhq.com/${boardKey}`,
      boardKey,
    }),
  ).toBe(expected);
});
