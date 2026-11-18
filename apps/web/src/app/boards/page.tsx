import type { Metadata } from "next";
import { connection } from "next/server";

import { BoardsClient } from "@/features/boards/boards-client";

export const metadata: Metadata = { title: "Boards · Job board" };

export default async function BoardsPage() {
  // Render URL-based tabs in the initial response instead of a whole-page CSR fallback.
  await connection();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Boards</h1>
        <p className="text-sm text-muted-foreground">
          Manage your sources and keep their jobs up to date.
        </p>
      </header>
      <BoardsClient />
    </div>
  );
}
