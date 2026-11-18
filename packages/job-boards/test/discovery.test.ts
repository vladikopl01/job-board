import { expect, it } from "vitest";
import {
  countryOptions,
  departmentOptions,
  departmentsFor,
  geographyForLocations,
} from "../src/index.ts";
import type { PostingLocation } from "../src/posting.ts";

function place(text: string, country: string | null = null): PostingLocation {
  return { text, country, address: null };
}

it("deduplicates explicit countries across locations, preferring structured source countries", () => {
  const source = [place("Madrid, Spain"), place("Remote - España"), place("Germany", "ESP")];
  const before = structuredClone(source);
  expect(geographyForLocations(source)).toEqual({ countries: ["ES"], regions: ["europe"] });
  expect(source).toEqual(before);
});

it.each([
  ["Remote (EU)", ["europe"]],
  ["European Union", ["europe"]],
  ["Europe excluding Spain and Germany", ["europe"]],
  ["Europe, except Spain, Germany and France", ["europe"]],
  ["Remote - EMEA", ["emea"]],
  ["Europe, Middle East and Africa", ["emea"]],
  ["APAC", ["apac"]],
  ["Latin America", ["latin-america"]],
  ["Worldwide", ["worldwide"]],
])("keeps broad region %s without inventing countries", (text, regions) => {
  expect(geographyForLocations([place(text)])).toEqual({ countries: [], regions });
});

it.each([
  "Barcelona",
  "Remote",
  "CA",
  "NY",
  "IN",
  "Georgia",
  "Not eligible: Spain",
  "Outside Spain",
  "Remote, excluding Spain, Germany",
  "No France or Spain",
  "Spain not eligible",
  "Spain (excluded)",
])("keeps ambiguous, missing or excluded geography Unknown: %s", (text) => {
  expect(geographyForLocations([place(text)])).toEqual({ countries: [], regions: [] });
});

it("recognizes complete country segments and common aliases without confusing countries containing and", () => {
  expect(
    geographyForLocations([
      place("Spain or Portugal"),
      place("Trinidad and Tobago"),
      place("U.S."),
      place("Remote (UK)"),
    ]),
  ).toEqual({
    countries: ["ES", "PT", "TT", "US", "GB"],
    regions: ["europe", "north-america", "americas", "latin-america"],
  });
  expect(geographyForLocations([place("Georgia", "GE")])).toEqual({
    countries: ["GE"],
    regions: ["asia"],
  });
  expect(
    geographyForLocations([place("Tokyo", "JP"), place("Brazil"), place("Australia")]),
  ).toEqual({
    countries: ["JP", "BR", "AU"],
    regions: ["asia", "south-america", "americas", "latin-america", "oceania"],
  });
});

it.each([
  ["Engineering", null, ["engineering"]],
  ["Software Engineering", null, ["engineering"]],
  ["Eng", null, ["engineering"]],
  ["Product Marketing", null, ["marketing", "product"]],
  ["Engineering & Data", null, ["engineering", "data"]],
  [null, "Marketing", ["marketing"]],
  [" ", "Talent Acquisition", ["people"]],
  ["Legal", "Engineering", ["legal"]],
  ["Unfamiliar group", "Engineering", ["other"]],
  [null, null, []],
])("groups explicit department %s or fallback team %s", (department, team, expected) => {
  expect(departmentsFor({ department, team })).toEqual(expected);
});

it("offers stable unique identifiers and names, with explicit missing-data choices", () => {
  expect(new Set(countryOptions.map((option) => option.value)).size).toBe(countryOptions.length);
  expect(countryOptions).toContainEqual({ value: "US", label: "United States" });
  expect(countryOptions).toContainEqual({ value: "unknown", label: "Unknown" });
  expect(departmentOptions).toContainEqual({ value: "unknown", label: "Unknown" });
  expect(departmentOptions).toContainEqual({ value: "other", label: "Other" });
});
