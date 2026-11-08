import { after } from "next/server";

import {
  assertLocalJsonMutation,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/features/boards/server/http";
import { createBoard, listBoards } from "@/features/boards/server/service";
import { drainRefreshes } from "@/features/refresh/server/coordinator";
import { getDatabase } from "@/server/database";

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
    const board = createBoard(input);
    const db = getDatabase();
    after(async () => {
      await drainRefreshes({ db });
    });
    return jsonResponse({ board }, 201);
  } catch (cause) {
    return errorResponse(cause);
  }
}
