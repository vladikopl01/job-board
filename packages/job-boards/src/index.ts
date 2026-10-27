type BoardKey = {
  boardKey: string;
  canonicalUrl: string;
};

export type BoardSource = BoardKey &
  (
    | { provider: "ashby"; sourceHost: "jobs.ashbyhq.com" }
    | { provider: "lever"; sourceHost: "jobs.lever.co" | "jobs.eu.lever.co" }
  );

const hostedSites = [
  { provider: "ashby", sourceHost: "jobs.ashbyhq.com" },
  { provider: "lever", sourceHost: "jobs.lever.co" },
  { provider: "lever", sourceHost: "jobs.eu.lever.co" },
] satisfies Omit<BoardSource, keyof BoardKey>[];

const unsupportedUrl = {
  success: false,
  message:
    "Use an HTTPS company board URL such as https://jobs.ashbyhq.com/ramp, https://jobs.lever.co/moonpay, or https://jobs.eu.lever.co/company.",
} satisfies { success: false; message: string };

export function companyNameFromSlug({ boardKey }: BoardSource): string {
  const name = boardKey
    .split(/[-_.~]+/u)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return (name || boardKey).slice(0, 120).trim();
}

export function identifyBoardUrl(
  input: string,
): { success: true; source: BoardSource } | { success: false; message: string } {
  if (input.length > 2048) return unsupportedUrl;

  const trimmed = input.trim();
  // oxlint-disable-next-line no-control-regex -- The URL parser otherwise removes embedded controls.
  if (/[\u0000-\u001f\u007f-\u009f\\]/u.test(trimmed)) return unsupportedUrl;

  // Validate the original path before URL can remove dot segments or repair slashes.
  const parts = /^https:\/\/([^/?#]+)(\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/iu.exec(trimmed);
  const authority = parts?.[1];
  const pathname = parts?.[2];
  if (!authority || !/^[A-Za-z0-9.-]+(?::[0-9]+)?$/u.test(authority) || !pathname) {
    return unsupportedUrl;
  }

  const path = /^\/([^/]+)\/?$/u.exec(pathname);
  const encodedKey = path?.[1];
  if (!encodedKey) return unsupportedUrl;

  try {
    const boardKey = decodeURIComponent(encodedKey);
    if (!/^[A-Za-z0-9._~-]+$/u.test(boardKey) || boardKey === "." || boardKey === "..") {
      return unsupportedUrl;
    }

    const url = new URL(trimmed);
    const site = hostedSites.find(({ sourceHost }) => sourceHost === url.hostname);
    if (!site || url.protocol !== "https:" || url.port || url.username || url.password) {
      return unsupportedUrl;
    }

    return {
      success: true,
      source: {
        ...site,
        boardKey,
        canonicalUrl: `https://${site.sourceHost}/${boardKey}`,
      },
    };
  } catch {
    return unsupportedUrl;
  }
}
