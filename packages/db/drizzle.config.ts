import { defineConfig } from "drizzle-kit";

import { resolveDatabasePaths } from "./src/paths.ts";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: resolveDatabasePaths().databasePath,
  },
});
