import { assertLocalJsonMutation, jsonResponse, readJson } from "@/features/boards/server/http";
import { readStateInputSchema } from "@/features/jobs/schemas";
import { indexingErrorResponse } from "@/features/jobs/server/errors";
import { setReadState } from "@/features/jobs/server/read-state";
import { validated } from "@/features/jobs/server/validation";
import { getDatabase } from "@/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertLocalJsonMutation(request);
    const input = validated(readStateInputSchema, await readJson(request));
    return jsonResponse(setReadState({ db: getDatabase(), input }));
  } catch (cause) {
    return indexingErrorResponse(cause);
  }
}
