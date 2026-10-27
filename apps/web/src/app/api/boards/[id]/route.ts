import {
  assertLocalJsonMutation,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/features/boards/server/http";
import { updateBoard } from "@/features/boards/server/service";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertLocalJsonMutation(request);
    const { id } = await params;
    const input = await readJson(request);
    return jsonResponse({ board: updateBoard({ id, input }) });
  } catch (cause) {
    return errorResponse(cause);
  }
}
