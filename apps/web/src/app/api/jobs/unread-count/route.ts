import { jsonResponse } from "@/features/boards/server/http";
import { indexingErrorResponse } from "@/features/jobs/server/errors";
import { unreadCount } from "@/features/jobs/server/service";
import { getDatabase } from "@/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    return jsonResponse(unreadCount(getDatabase()));
  } catch (cause) {
    return indexingErrorResponse(cause);
  }
}
