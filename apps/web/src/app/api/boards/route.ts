import {
  assertLocalJsonMutation,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/features/boards/server/http";
import { createBoard, listBoards } from "@/features/boards/server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    return jsonResponse({ boards: listBoards() });
  } catch (cause) {
    return errorResponse(cause);
  }
}

export async function POST(request: Request) {
  try {
    assertLocalJsonMutation(request);
    const input = await readJson(request);
    return jsonResponse({ board: createBoard(input) }, 201);
  } catch (cause) {
    return errorResponse(cause);
  }
}
