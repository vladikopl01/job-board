import { boards } from "@job-board/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { boardIdSchema } from "@/features/boards/schemas";
import { getDatabase } from "@/server/database";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = boardIdSchema.safeParse((await params).id);
  if (!id.success) notFound();

  const board = getDatabase()
    .select({ archivedAt: boards.archivedAt })
    .from(boards)
    .where(eq(boards.id, id.data))
    .get();
  if (!board) notFound();

  // Keep company links usable until dedicated company pages are available.
  const view = board.archivedAt === null ? "" : "?view=archived";
  redirect(`/boards${view}#board-${id.data}`);
}
