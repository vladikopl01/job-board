import { after } from "next/server";

import { assertLocalJsonMutation, jsonResponse, readJson } from "@/features/boards/server/http";
import { indexingErrorResponse } from "@/features/jobs/server/errors";
import { validated } from "@/features/jobs/server/validation";
import { drainRefreshes } from "@/features/refresh/server/coordinator";
import { refreshBatchInputSchema } from "@/features/refresh/schemas";
import { enqueueActiveBoards, latestRefreshes } from "@/features/refresh/server/store";
import { getDatabase } from "@/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    return jsonResponse({ refreshes: latestRefreshes(getDatabase()) });
  } catch (cause) {
    return indexingErrorResponse(cause);
  }
}

export async function POST(request: Request) {
  try {
    assertLocalJsonMutation(request);
    const input = validated(refreshBatchInputSchema, await readJson(request));
    const db = getDatabase();
    const results = enqueueActiveBoards({ db, requestSource: input.source });
    after(async () => {
      await drainRefreshes({ db });
    });
    return jsonResponse({ results }, 202);
  } catch (cause) {
    return indexingErrorResponse(cause);
  }
}
