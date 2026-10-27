import "server-only";

import { companyNameFromSlug, type BoardSource } from "@job-board/job-boards";
import { parse } from "parse5";

import { boardDisplayNameSchema, type BoardNameSuggestion } from "../schemas";

function cleanCompanyName(value: string): string | null {
  const name = value
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/\s*[|–—-]\s*(?:ashby|lever)(?:\s+jobs)?$/iu, "")
    .replace(/^(?:jobs|careers|open positions|job openings)\s+(?:at|with)\s+/iu, "")
    .replace(/(?:\s*[|–—-]\s*|\s+)(?:jobs|careers|open positions|job openings|job board)$/iu, "")
    .trim();
  const result = boardDisplayNameSchema.safeParse(name);
  if (
    !result.success ||
    /^(?:ashby|lever|jobs|careers|job board|open positions|job openings|(?:(?:404|page|board|job|job board)\s+)?not found|error|404)$/iu.test(
      name,
    )
  ) {
    return null;
  }
  return result.data;
}

function companyNameFromHtml(html: string): string | null {
  const document = parse(html);
  const root = document.childNodes.find((node) => node.nodeName === "html");
  if (!root || !("childNodes" in root)) return null;
  const head = root.childNodes.find((node) => node.nodeName === "head");
  if (!head || !("childNodes" in head)) return null;

  const metadata = new Map<string, string>();
  let title = "";
  for (const node of head.childNodes) {
    if (!("tagName" in node)) continue;
    if (node.tagName === "meta") {
      const name = node.attrs.find(({ name }) => name === "property" || name === "name")?.value;
      const content = node.attrs.find(({ name }) => name === "content")?.value;
      if (name && content && !metadata.has(name.toLowerCase())) {
        metadata.set(name.toLowerCase(), content);
      }
    } else if (node.tagName === "title") {
      title = node.childNodes.map((child) => ("value" in child ? child.value : "")).join("");
    }
  }
  for (const candidate of [
    metadata.get("og:site_name"),
    metadata.get("og:title"),
    metadata.get("twitter:title"),
    title,
  ]) {
    const name = candidate ? cleanCompanyName(candidate) : null;
    if (name) return name;
  }
  return null;
}

async function readHtmlPrefix(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const limit = 256 * 1024;
  let bytes = 0;
  let html = "";
  try {
    while (bytes < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value.subarray(0, limit - bytes);
      html += decoder.decode(chunk, { stream: true });
      bytes += chunk.byteLength;
    }
    return html + decoder.decode();
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}

export async function lookupBoardName({
  source,
  signal,
}: {
  source: BoardSource;
  signal: AbortSignal;
}): Promise<BoardNameSuggestion> {
  const fallback = {
    displayName: companyNameFromSlug(source),
    source: "slug",
  } satisfies BoardNameSuggestion;
  try {
    const response = await fetch(source.canonicalUrl, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(4_000)]),
      headers: { Accept: "text/html, application/xhtml+xml" },
    });
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!response.ok || (contentType !== "text/html" && contentType !== "application/xhtml+xml")) {
      await response.body?.cancel();
      return fallback;
    }
    const displayName = companyNameFromHtml(await readHtmlPrefix(response));
    return displayName ? { displayName, source: "metadata" } : fallback;
  } catch {
    // Name lookup is optional; network failures must not prevent local registration.
    return fallback;
  }
}
