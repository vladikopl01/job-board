import "server-only";

import type { BoardErrorResponse } from "../schemas";
import { BoardRequestError, errorCauses } from "./errors";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function assertLocalJsonMutation(request: Request) {
  let allowed = false;
  try {
    const url = new URL(request.url);
    const host = request.headers.get("host");
    if (host && !/[\s\\/@?#]/.test(host)) {
      const hostUrl = new URL(`${url.protocol}//${host}`);
      // Next.js can build request.url from its bind address rather than the browser's Host.
      allowed =
        (url.protocol === "http:" || url.protocol === "https:") &&
        loopbackHosts.has(url.hostname) &&
        loopbackHosts.has(hostUrl.hostname) &&
        hostUrl.port === url.port &&
        request.headers.get("origin") === hostUrl.origin;
    }
  } catch {
    // Malformed authority values are rejected before reading the body or opening SQLite.
  }
  if (!allowed) {
    throw new BoardRequestError({
      status: 403,
      error: {
        code: "FORBIDDEN",
        message: "Open the app on localhost and submit this change from the same app origin.",
      },
    });
  }

  if (
    request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json"
  ) {
    throw new BoardRequestError({
      status: 415,
      error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Send board changes as application/json." },
    });
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BoardRequestError({
      status: 400,
      error: { code: "INVALID_JSON", message: "The request body must contain valid JSON." },
    });
  }
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(cause: unknown) {
  if (cause instanceof BoardRequestError) {
    return jsonResponse({ error: cause.error } satisfies BoardErrorResponse, cause.status);
  }

  const missingSchema = [...errorCauses(cause)].some((error) =>
    error.message.includes("no such table: boards"),
  );
  const error: BoardErrorResponse["error"] = missingSchema
    ? {
        code: "STORAGE_NOT_READY",
        message: "Local board storage is not ready. Run pnpm db:migrate, then retry.",
      }
    : {
        code: "STORAGE_ERROR",
        message:
          "Could not access local board storage. Check that the data directory is writable, then retry.",
      };
  return jsonResponse({ error } satisfies BoardErrorResponse, 500);
}
