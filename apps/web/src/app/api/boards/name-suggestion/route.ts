import { identifyBoardUrl } from "@job-board/job-boards";

import { boardNameRequestSchema } from "@/features/boards/schemas";
import { BoardRequestError, invalidInput } from "@/features/boards/server/errors";
import {
  assertLocalJsonMutation,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/features/boards/server/http";
import { lookupBoardName } from "@/features/boards/server/name-suggestion";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertLocalJsonMutation(request);
    const input = boardNameRequestSchema.safeParse(await readJson(request));
    if (!input.success) throw invalidInput(input.error);
    const identified = identifyBoardUrl(input.data.url);
    if (!identified.success) {
      throw new BoardRequestError({
        status: 400,
        error: { code: "INVALID_INPUT", message: identified.message },
      });
    }
    return jsonResponse(
      await lookupBoardName({ source: identified.source, signal: request.signal }),
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
