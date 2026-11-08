import { assertLocalJsonMutation, jsonResponse, readJson } from "@/features/boards/server/http";
import { emptyMutationSchema, internalIdSchema } from "@/features/jobs/schemas";
import { indexingErrorResponse } from "@/features/jobs/server/errors";
import { replacePosting } from "@/features/jobs/server/reconcile";
import { validated } from "@/features/jobs/server/validation";
import { getDatabase } from "@/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertLocalJsonMutation(request);
    const id = validated(internalIdSchema, (await params).id);
    validated(emptyMutationSchema, await readJson(request));
    return jsonResponse({ id: replacePosting({ db: getDatabase(), id }) }, 201);
  } catch (cause) {
    return indexingErrorResponse(cause);
  }
}
