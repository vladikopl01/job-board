import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./test/fixtures/schema.ts",
  out: "./test/fixtures/migrations",
});
