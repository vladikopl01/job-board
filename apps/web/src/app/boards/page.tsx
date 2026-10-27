import type { Metadata } from "next";

import { BoardsClient } from "@/features/boards/boards-client";

export const metadata: Metadata = { title: "Boards · Job board" };

export default function BoardsPage() {
  return (
    <div className="min-w-0">
      <h1 className="sr-only">Boards</h1>
      <BoardsClient />
    </div>
  );
}
