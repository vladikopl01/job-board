import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig = {
  transpilePackages: ["@job-board/db", "@job-board/job-boards"],
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: fileURLToPath(new URL("../..", import.meta.url)),
  },
} satisfies NextConfig;

export default nextConfig;
