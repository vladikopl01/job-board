import type { Metadata } from "next";
import { connection } from "next/server";

import { BoardsClient } from "@/features/boards/boards-client";

export const metadata: Metadata = { title: "Boards · Job board" };

export default async function BoardsPage() {
  // Render URL-based tabs in the initial response instead of a whole-page CSR fallback.
  await connection();
  return (
    <div className="min-w-0">
      <h1 className="sr-only">Boards</h1>
      <BoardsClient />
    </div>
  );
}
