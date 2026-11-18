import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BoardDetailsClient } from "@/features/boards/board-details-client";
import { boardIdSchema } from "@/features/boards/schemas";

export const metadata: Metadata = { title: "Board · Job board" };

export default async function BoardDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const id = boardIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  return <BoardDetailsClient id={id.data} />;
}
