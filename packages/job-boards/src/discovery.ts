import { countryRows } from "./countries.ts";
import type { PostingLocation } from "./posting.ts";

function key(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

const countries = countryRows.map(([value, alpha3, label, sourceName, region, subregion]) => ({
  value,
  alpha3,
  label,
  sourceName,
  region,
  subregion,
}));
const countryByCode = new Map(countries.map((country) => [country.value, country]));
const countryByAlias = new Map(
  countries.flatMap((country) =>
    [country.value, country.alpha3, country.label, country.sourceName].map(
      (alias) => [key(alias), country] as const,
    ),
  ),
);
for (const [alias, code] of Object.entries({
  UK: "GB",
  "Great Britain": "GB",
  "U.S.": "US",
  "U.S.A.": "US",
  USA: "US",
  UAE: "AE",
  "Czech Republic": "CZ",
  "South Korea": "KR",
  "North Korea": "KP",
  Turkey: "TR",
  Vietnam: "VN",
  Russia: "RU",
  Laos: "LA",
  "Ivory Coast": "CI",
  "Hong Kong": "HK",
  Macau: "MO",
  España: "ES",
  Deutschland: "DE",
})) {
  const country = countryByCode.get(code);
  if (country) countryByAlias.set(key(alias), country);
}

export const countryOptions = [
  ...countries
    .map(({ value, label }) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "en")),
  { value: "unknown", label: "Unknown" },
];

export const regionOptions = [
  { value: "africa", label: "Africa" },
  { value: "americas", label: "Americas" },
  { value: "antarctica", label: "Antarctica" },
  { value: "asia", label: "Asia" },
  { value: "apac", label: "Asia-Pacific (APAC)" },
  { value: "emea", label: "Europe, Middle East and Africa (EMEA)" },
  { value: "europe", label: "Europe" },
  { value: "latin-america", label: "Latin America and Caribbean" },
  { value: "north-america", label: "North America" },
  { value: "oceania", label: "Oceania" },
  { value: "south-america", label: "South America" },
  { value: "worldwide", label: "Worldwide" },
  { value: "unknown", label: "Unknown" },
];
const regionByAlias = new Map(regionOptions.map((region) => [key(region.label), region.value]));
for (const [alias, region] of Object.entries({
  EU: "europe",
  "European Union": "europe",
  "European Economic Area": "europe",
  EEA: "europe",
  European: "europe",
  APAC: "apac",
  "Asia Pacific": "apac",
  EMEA: "emea",
  "Europe Middle East and Africa": "emea",
  "Europe Middle East Africa": "emea",
  LATAM: "latin-america",
  "Latin America": "latin-america",
  "North America": "north-america",
  NAMER: "north-america",
  NORAM: "north-america",
  "South America": "south-america",
  Global: "worldwide",
  Worldwide: "worldwide",
  "Anywhere in the world": "worldwide",
}))
  regionByAlias.set(key(alias), region);

// Stop before exclusions so their comma/and-separated countries cannot become positive matches.
function positiveLocation(text: string) {
  // Postfix negation ("Spain not eligible") has no safely identifiable positive prefix.
  if (/\b(?:not|no|outside|ineligible|excluded|prohibited|disallowed)\b/iu.test(text)) return "";
  return text.split(/\b(?:except|excluding|excludes|without|but)\b/iu)[0] ?? "";
}

export function geographyForLocations(locations: PostingLocation[]) {
  const countryCodes = new Set<string>();
  const regions = new Set<string>();
  function addCountry(country: (typeof countries)[number]) {
    countryCodes.add(country.value);
    regions.add(country.region);
    if (country.region === "north-america" || country.region === "south-america")
      regions.add("americas");
    if (country.subregion === "419") regions.add("latin-america");
  }
  function addText(text: string) {
    const candidate = key(text.replace(/^remote\s*(?:[:–—-]\s*)?/iu, ""));
    // Bare state/city abbreviations and Georgia are ambiguous without a structured country.
    const ambiguous =
      candidate === "georgia" ||
      (/^[a-z]{2}$/u.test(candidate) && candidate !== "us" && candidate !== "uk");
    const country = ambiguous ? undefined : countryByAlias.get(candidate);
    if (country) {
      addCountry(country);
      return true;
    }
    const region = regionByAlias.get(candidate);
    if (!region || region === "unknown") return false;
    regions.add(region);
    return true;
  }
  for (const location of locations) {
    const structured = location.country ? countryByAlias.get(key(location.country)) : undefined;
    if (structured) {
      addCountry(structured);
      continue;
    }
    if (location.country) addText(positiveLocation(location.country));
    const text = positiveLocation(location.text);
    if (addText(text)) continue;
    for (const segment of text.split(/[,;|/()[\]]|\s+[–—-]\s+/u)) {
      addText(segment);
      if (!countryByAlias.has(key(segment))) {
        for (const part of segment.split(/\s+(?:and|or|&)\s+/iu)) addText(part);
      }
    }
  }
  return { countries: [...countryCodes], regions: [...regions] };
}

const departmentGroups = [
  {
    value: "engineering",
    label: "Engineering",
    match: /\b(?:engineering|engineers?|eng|software development)\b|^software$/iu,
  },
  { value: "marketing", label: "Marketing", match: /\bmarketing\b/iu },
  { value: "sales", label: "Sales", match: /\b(?:sales|business development)\b/iu },
  { value: "product", label: "Product", match: /\bproduct\b/iu },
  { value: "design", label: "Design", match: /\b(?:design|ux|ui)\b/iu },
  {
    value: "data",
    label: "Data and AI",
    match: /\b(?:data|analytics|machine learning|artificial intelligence|ai)\b/iu,
  },
  {
    value: "people",
    label: "People and Recruiting",
    match: /\b(?:people|human resources|hr|recruiting|recruitment|talent)\b/iu,
  },
  {
    value: "finance",
    label: "Finance and Accounting",
    match: /\b(?:finance|financial|accounting)\b/iu,
  },
  { value: "legal", label: "Legal and Compliance", match: /\b(?:legal|compliance)\b/iu },
  {
    value: "operations",
    label: "Operations",
    match: /\b(?:operations|ops|administration|administrative)\b/iu,
  },
  {
    value: "customer-success",
    label: "Customer Success",
    match: /\b(?:customer success|customer experience|account management)\b/iu,
  },
  { value: "support", label: "Support", match: /\b(?:support|customer service)\b/iu },
  { value: "security", label: "Security", match: /\bsecurity\b/iu },
  { value: "it", label: "IT", match: /\b(?:information technology|it)\b/iu },
];
export const departmentOptions = [
  ...departmentGroups
    .map(({ value, label }) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "en")),
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

export function departmentsFor({
  department,
  team,
}: {
  department: string | null;
  team: string | null;
}) {
  const source = department?.trim() || team?.trim();
  if (!source) return [];
  const groups = departmentGroups
    .filter(({ match }) => match.test(source))
    .map(({ value }) => value);
  return groups.length ? groups : ["other"];
}
