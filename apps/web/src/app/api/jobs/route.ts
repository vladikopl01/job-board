import { jsonResponse } from "@/features/boards/server/http";
import { jobListInputSchema } from "@/features/jobs/schemas";
import { indexingErrorResponse } from "@/features/jobs/server/errors";
import { listJobs } from "@/features/jobs/server/service";
import { validated } from "@/features/jobs/server/validation";
import { getDatabase } from "@/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  try {
    const input = validated(
      jobListInputSchema,
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return jsonResponse(listJobs({ db: getDatabase(), input }));
  } catch (cause) {
    return indexingErrorResponse(cause);
  }
}
