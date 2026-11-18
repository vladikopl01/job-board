import {
  departmentsFor,
  geographyForLocations,
  normalizedPostingSchema,
} from "@job-board/job-boards";
import type Sqlite from "better-sqlite3";

export function registerDiscoveryFunctions(sqlite: Sqlite.Database) {
  function geography(value: unknown) {
    const decoded: unknown = typeof value === "string" ? JSON.parse(value) : value;
    return geographyForLocations(normalizedPostingSchema.shape.locations.parse(decoded));
  }
  sqlite.function("posting_countries", { deterministic: true }, (value: unknown) =>
    JSON.stringify(geography(value).countries),
  );
  sqlite.function("posting_regions", { deterministic: true }, (value: unknown) =>
    JSON.stringify(geography(value).regions),
  );
  sqlite.function(
    "posting_departments",
    { deterministic: true },
    (department: unknown, team: unknown) =>
      JSON.stringify(
        departmentsFor({
          department: typeof department === "string" ? department : null,
          team: typeof team === "string" ? team : null,
        }),
      ),
  );
}
