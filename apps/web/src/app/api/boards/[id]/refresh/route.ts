import { after } from "next/server";

import { assertLocalJsonMutation, jsonResponse, readJson } from "@/features/boards/server/http";
import { emptyMutationSchema, internalIdSchema } from "@/features/jobs/schemas";
import { indexingErrorResponse } from "@/features/jobs/server/errors";
import { validated } from "@/features/jobs/server/validation";
import { drainRefreshes } from "@/features/refresh/server/coordinator";
import { enqueueRefresh } from "@/features/refresh/server/store";
import { getDatabase } from "@/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertLocalJsonMutation(request);
    const boardId = validated(internalIdSchema, (await params).id);
    validated(emptyMutationSchema, await readJson(request));
    const db = getDatabase();
    const task = enqueueRefresh({ db, boardId, requestSource: "manual" });
    after(async () => {
      await drainRefreshes({ db });
    });
    return jsonResponse({ taskId: task.id }, 202);
  } catch (cause) {
    return indexingErrorResponse(cause);
  }
}
