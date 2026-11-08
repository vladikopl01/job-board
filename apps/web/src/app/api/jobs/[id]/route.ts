import { jsonResponse } from "@/features/boards/server/http";
import { internalIdSchema } from "@/features/jobs/schemas";
import { indexingErrorResponse } from "@/features/jobs/server/errors";
import { jobDetails } from "@/features/jobs/server/service";
import { validated } from "@/features/jobs/server/validation";
import { getDatabase } from "@/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = validated(internalIdSchema, (await params).id);
    return jsonResponse({ posting: jobDetails({ db: getDatabase(), id }) });
  } catch (cause) {
    return indexingErrorResponse(cause);
  }
}
