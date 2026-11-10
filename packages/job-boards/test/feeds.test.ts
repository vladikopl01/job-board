import { expect, it, vi } from "vitest";

import { identifyBoardUrl } from "../src/index.ts";
import { htmlToText } from "../src/html.ts";
import { createFeedSession, FeedError, feedLimits, fetchSnapshot } from "../src/server.ts";
import { ashbyJob, leverJob } from "./fixtures/postings.ts";

function source(url = "https://jobs.ashbyhq.com/example") {
  const result = identifyBoardUrl(url);
  if (!result.success) throw new Error(result.message);
  return result.source;
}

function session(fetcher: typeof fetch, limits = feedLimits) {
  return createFeedSession({ signal: new AbortController().signal, fetcher, limits });
}

it("retains Ashby content, multi-location restrictions, compensation and unknown source fields", async () => {
  const job = ashbyJob("one", {
    address: { postalAddress: { addressCountry: "ESP" } },
    secondaryLocations: [{ location: "EU only", address: { addressCountry: "EU" } }],
    compensation: { compensationTierSummary: "EUR 80k" },
    futureField: { retained: true },
  });
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ apiVersion: "1", jobs: [job, { isListed: false }] }));
  const result = await fetchSnapshot(source(), session(fetcher));
  expect(result.postings).toHaveLength(1);
  expect(result.postings[0]).toMatchObject({
    externalReference: "one",
    descriptionPlain: "Build useful software.",
    workplaceType: "hybrid",
    locations: [
      { text: "Spain", country: "ESP" },
      { text: "EU only", country: "EU" },
    ],
    compensation: { compensationTierSummary: "EUR 80k" },
    raw: { futureField: { retained: true } },
  });
  expect(String(fetcher.mock.calls[0]?.[0])).toBe(
    "https://api.ashbyhq.com/posting-api/job-board/example?includeCompensation=true",
  );
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ redirect: "error", credentials: "omit" });
});

it("uses an unambiguous Ashby URL reference and leaves ambiguous remote flags unknown", async () => {
  const { id: _id, ...job } = ashbyJob("one", { workplaceType: null, isRemote: true });
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ apiVersion: "1", jobs: [job] }));
  expect((await fetchSnapshot(source(), session(fetcher))).postings[0]).toMatchObject({
    externalReference: "one",
    workplaceType: "unknown",
    compensation: null,
  });
});

it.each([
  { apiVersion: "2", jobs: [] },
  {},
  { apiVersion: "1", jobs: [ashbyJob("one"), ashbyJob("one")] },
  { apiVersion: "1", jobs: [ashbyJob("one", { title: "" })] },
  { apiVersion: "1", jobs: [ashbyJob("one", { id: "another" })] },
  { apiVersion: "1", jobs: [ashbyJob("one", { applyUrl: "javascript:alert(1)" })] },
  { apiVersion: "1", jobs: [ashbyJob("one", { jobUrl: "https://user:secret@example.com/job" })] },
])("rejects the whole malformed or ambiguous Ashby snapshot: %j", async (body) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
  await expect(fetchSnapshot(source(), session(fetcher))).rejects.toBeInstanceOf(FeedError);
});

it("keeps Lever's primary country separate from secondary location countries", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json([
        leverJob("one", {
          country: "IN",
          categories: {
            location: "Bengaluru, Karnataka",
            allLocations: ["Bengaluru, Karnataka", "South Africa - Hybrid"],
          },
        }),
        leverJob("two", { country: "GB", categories: { allLocations: ["Europe", "London"] } }),
      ]),
    )
    .mockResolvedValueOnce(Response.json([]));
  const result = await fetchSnapshot(source("https://jobs.lever.co/example"), session(fetcher));
  expect(result.postings[0]?.locations).toEqual([
    { text: "Bengaluru, Karnataka", country: "IN", address: null },
    { text: "South Africa - Hybrid", country: null, address: null },
  ]);
  expect(result.postings[1]?.locations).toEqual([
    { text: "Europe", country: null, address: null },
    { text: "London", country: null, address: null },
  ]);
  expect(result.postings[0]?.raw.country).toBe("IN");
});

it("traverses short Lever EU pages until empty and retains full descriptions once", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json([leverJob("one")]))
    .mockResolvedValueOnce(Response.json([leverJob("two")]))
    .mockResolvedValueOnce(Response.json([]));
  const result = await fetchSnapshot(source("https://jobs.eu.lever.co/example"), session(fetcher));
  expect(result.postings).toHaveLength(2);
  const description = result.postings[0]?.descriptionPlain;
  expect(description).toContain("Requirements\n• TypeScript");
  expect(description).toContain("Benefits");
  expect(description?.match(/Opening/g)).toHaveLength(1);
  expect(result.postings[0]).toMatchObject({
    workplaceType: "remote",
    locations: [{ text: "Europe" }, { text: "Spain" }],
    compensation: { range: { currency: "EUR" } },
  });
  expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual(
    [0, 1, 2].map(
      (skip) => `https://api.eu.lever.co/v0/postings/example?mode=json&limit=100&skip=${skip}`,
    ),
  );
});

it("accepts Lever's onsite spelling without changing the retained source value", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json([
        leverJob("one", { workplaceType: "onsite" }),
        leverJob("two", { workplaceType: "on-site" }),
      ]),
    )
    .mockResolvedValueOnce(Response.json([]));
  const result = await fetchSnapshot(source("https://jobs.lever.co/example"), session(fetcher));
  expect(result.postings).toMatchObject([
    { workplaceType: "on-site", raw: { workplaceType: "onsite" } },
    { workplaceType: "on-site", raw: { workplaceType: "on-site" } },
  ]);
});

it("retains Lever headings, list boundaries, links, and plain-only sections in rich descriptions", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json([
        leverJob("one", {
          description: '<p>Learn <a href="https://example.com/team">about the team</a>.</p>',
          lists: [{ text: "Skills & <experience>", content: "<li>TypeScript</li><li>React</li>" }],
          additional: null,
          additionalPlain: "Benefits & learning\n\nFlexible hours",
        }),
      ]),
    )
    .mockResolvedValueOnce(Response.json([]));
  const posting = (await fetchSnapshot(source("https://jobs.lever.co/example"), session(fetcher)))
    .postings[0];
  expect(posting?.descriptionHtml).toContain("<h2>Skills &amp; &lt;experience&gt;</h2>");
  expect(posting?.descriptionHtml).toContain("<ul><li>TypeScript</li><li>React</li></ul>");
  expect(posting?.descriptionHtml).toContain('href="https://example.com/team"');
  expect(posting?.descriptionHtml).toContain("<p>Benefits &amp; learning</p><p>Flexible hours</p>");
  expect(posting?.descriptionHtml).toContain("EUR 80,000 per year");
});

it("uses the HTML sections when providers supply empty optional plain-text fields", async () => {
  const cases = [
    {
      url: "https://jobs.ashbyhq.com/example",
      body: { apiVersion: "1", jobs: [ashbyJob("one", { descriptionPlain: "" })] },
      expectedText: ["Build useful software."],
    },
    {
      url: "https://jobs.lever.co/example",
      body: [
        leverJob("one", {
          description: "",
          descriptionPlain: "",
          openingPlain: "",
          descriptionBodyPlain: "",
          opening: "<p>Build useful software.</p>",
          additional: "<p>Benefits</p>",
          additionalPlain: "",
          salaryDescription: "<p>EUR 80,000 per year</p>",
          salaryDescriptionPlain: "",
        }),
      ],
      expectedText: ["Build useful software.", "Benefits", "EUR 80,000 per year"],
    },
  ];
  for (const testCase of cases) {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(testCase.body))
      .mockImplementation(async () => Response.json([]));
    const posting = (await fetchSnapshot(source(testCase.url), session(fetcher))).postings[0];
    for (const text of testCase.expectedText) expect(posting?.descriptionPlain).toContain(text);
    expect(posting?.descriptionHtml).toContain("<p>Build useful software.</p>");
  }
});

it("keeps boundaries in HTML-only descriptions and table-based pay notes", async () => {
  const salaryDescription =
    "<table><tr><th>Region</th><th>Salary</th></tr><tr><td>London</td><td>GBP 80,000</td></tr></table>";
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json([
        leverJob("one", {
          description:
            "<h5>Requirements</h5>TypeScript<h6>Benefits</h6>Learning<dl><dt>Team</dt><dd>Product</dd></dl><blockquote>Work together</blockquote><pre>Run tests</pre><hr>Apply",
          lists: [],
          additional: null,
          salaryDescriptionPlain: "",
          salaryDescription,
        }),
      ]),
    )
    .mockResolvedValueOnce(Response.json([]));
  const posting = (await fetchSnapshot(source("https://jobs.lever.co/example"), session(fetcher)))
    .postings[0];

  expect(posting?.descriptionPlain).toMatch(
    /Requirements\s+TypeScript\s+Benefits\s+Learning\s+Team\s+Product/u,
  );
  expect(posting?.descriptionPlain).toMatch(/Work together\s+Run tests\s+Apply/u);
  expect(posting?.compensation).toMatchObject({
    description: "Region Salary\n\nLondon GBP 80,000",
  });
  expect(posting?.raw.salaryDescription).toBe(salaryDescription);
});

it("rejects overlapping Lever pages and late page failures", async () => {
  for (const response of [
    Response.json([leverJob("one")]),
    new Response("failed", { status: 503 }),
  ]) {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([leverJob("one")]))
      .mockResolvedValueOnce(response);
    await expect(
      fetchSnapshot(source("https://jobs.lever.co/example"), session(fetcher)),
    ).rejects.toBeInstanceOf(FeedError);
  }
});

it("accepts valid empty feeds but never interprets HTML or truncated JSON as empty", async () => {
  const empty = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ apiVersion: "1", jobs: [] }));
  expect(await fetchSnapshot(source(), session(empty))).toEqual({ postings: [] });
  for (const response of [
    new Response("<html>error</html>"),
    new Response('{"jobs":', { headers: { "content-type": "application/json" } }),
    new Response(null, { status: 302, headers: { location: "http://localhost/private" } }),
  ]) {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(fetchSnapshot(source(), session(fetcher))).rejects.toBeInstanceOf(FeedError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  }
});

it("bounds aggregate bytes, page counts, posting counts, timeout and cancellation", async () => {
  for (const limits of [
    { ...feedLimits, bytes: 8 },
    { ...feedLimits, postings: 0 },
    { ...feedLimits, pages: 0 },
  ]) {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({ apiVersion: "1", jobs: [ashbyJob()] }));
    await expect(fetchSnapshot(source(), session(fetcher, limits))).rejects.toMatchObject({
      code: "LIMIT",
    });
  }
  const controller = new AbortController();
  controller.abort();
  const fetcher = vi.fn<typeof fetch>();
  await expect(
    fetchSnapshot(source(), createFeedSession({ signal: controller.signal, fetcher })),
  ).rejects.toMatchObject({ code: "CANCELLED" });
  expect(fetcher).not.toHaveBeenCalled();
  const stalled = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => undefined));
  await expect(
    fetchSnapshot(source(), session(stalled, { ...feedLimits, requestMs: 10 })),
  ).rejects.toMatchObject({ code: "LIMIT" });
});

it("exposes safe rate-limit timing and never includes provider bodies in failures", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response("private provider details", { status: 429, headers: { "retry-after": "60" } }),
    );
  await expect(fetchSnapshot(source(), session(fetcher))).rejects.toMatchObject({
    code: "RATE_LIMIT",
    retryAt: expect.any(String),
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  for (const retryAfter of ["invalid", "0", "999999999999"]) {
    const invalid = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, { status: 429, headers: { "retry-after": retryAfter } }),
      );
    await expect(fetchSnapshot(source(), session(invalid))).rejects.toMatchObject({
      code: "RATE_LIMIT",
      retryAt: null,
    });
  }
});

it("extracts readable sections without active or hidden HTML content", () => {
  expect(
    htmlToText(
      '<p>Build &amp; learn</p><script>alert(1)</script><style>bad</style><ul><li>TypeScript</li></ul><img src="https://evil.test/pixel">',
    ),
  ).toBe("Build & learn\n\n• TypeScript");
});
