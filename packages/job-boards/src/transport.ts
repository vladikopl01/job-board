export const feedLimits = {
  requestMs: 20_000,
  attemptMs: 90_000,
  bytes: 20 * 1024 * 1024,
  postings: 10_000,
  pages: 202,
};

export class FeedError extends Error {
  readonly code: "INVALID_FEED" | "TRANSPORT" | "LIMIT" | "RATE_LIMIT" | "CANCELLED";
  readonly retryAt: string | null;
  constructor(code: FeedError["code"], message: string, retryAt: string | null = null) {
    super(message);
    this.name = "FeedError";
    this.code = code;
    this.retryAt = retryAt;
  }
}

export type FeedSession = ReturnType<typeof createFeedSession>;

function retryDeadline(value: string | null) {
  if (!value) return null;
  const timestamp = /^\d+$/.test(value) ? Date.now() + Number(value) * 1000 : Date.parse(value);
  // Persist four-digit UTC years so retry timestamps sort and validate consistently.
  return Number.isFinite(timestamp) && timestamp > Date.now() && timestamp < Date.UTC(10_000, 0, 1)
    ? new Date(timestamp).toISOString()
    : null;
}

async function withSignal<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let stop: (() => void) | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        stop = () => reject(signal.reason);
        signal.addEventListener("abort", stop, { once: true });
      }),
    ]);
  } finally {
    if (stop) signal.removeEventListener("abort", stop);
  }
}

export function createFeedSession({
  signal,
  fetcher = fetch,
  limits = feedLimits,
}: {
  signal: AbortSignal;
  fetcher?: typeof fetch;
  limits?: typeof feedLimits;
}) {
  const attemptSignal = AbortSignal.any([signal, AbortSignal.timeout(limits.attemptMs)]);
  let bytes = 0;
  let pages = 0;

  return {
    signal: attemptSignal,
    limits,
    async read(url: URL): Promise<unknown> {
      const requestSignal = AbortSignal.any([attemptSignal, AbortSignal.timeout(limits.requestMs)]);
      try {
        requestSignal.throwIfAborted();
        if (++pages > limits.pages)
          throw new FeedError("LIMIT", "The board exceeded its page limit.");
        const response = await withSignal(
          fetcher(url, {
            signal: requestSignal,
            redirect: "error",
            credentials: "omit",
            cache: "no-store",
            headers: { Accept: "application/json" },
          }),
          requestSignal,
        );
        if (response.status === 429) {
          await response.body?.cancel();
          throw new FeedError(
            "RATE_LIMIT",
            "The provider is rate limiting this board. Try later.",
            retryDeadline(response.headers.get("retry-after")),
          );
        }
        if (!response.ok || response.redirected || response.status >= 300) {
          await response.body?.cancel();
          throw new FeedError(
            "TRANSPORT",
            "The provider could not return this board. Check its source and retry.",
          );
        }
        const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
        if (
          !contentType ||
          !/^application\/(?:[\w.-]+\+)?json$/i.test(contentType) ||
          !response.body
        ) {
          await response.body?.cancel();
          throw new FeedError("INVALID_FEED", "The provider did not return a JSON feed.");
        }
        const length = Number(response.headers.get("content-length"));
        if (length > limits.bytes - bytes) {
          await response.body.cancel();
          throw new FeedError("LIMIT", "The board exceeded its response-size limit.");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8", { fatal: true });
        let body = "";
        let complete = false;
        try {
          while (true) {
            const chunk = await withSignal(reader.read(), requestSignal);
            if (chunk.done) break;
            bytes += chunk.value.byteLength;
            if (bytes > limits.bytes)
              throw new FeedError("LIMIT", "The board exceeded its response-size limit.");
            body += decoder.decode(chunk.value, { stream: true });
          }
          body += decoder.decode();
          complete = true;
        } finally {
          if (!complete) void reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
        requestSignal.throwIfAborted();
        const parsed: unknown = JSON.parse(body);
        return parsed;
      } catch (cause) {
        if (cause instanceof FeedError) throw cause;
        if (signal.aborted) throw new FeedError("CANCELLED", "The board refresh was cancelled.");
        if (requestSignal.aborted) throw new FeedError("LIMIT", "The board refresh timed out.");
        throw new FeedError(
          "TRANSPORT",
          "The provider feed could not be read. Your saved jobs are unchanged.",
        );
      }
    },
  };
}
