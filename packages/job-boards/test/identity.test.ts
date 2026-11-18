import { describe, expect, it } from "vitest";

import { cleanBoardUrl, identifyBoardUrl } from "../src/index.ts";

describe("identifyBoardUrl", () => {
  it.each([
    ["https://jobs.ashbyhq.com/ramp", "ashby", "jobs.ashbyhq.com", "ramp"],
    [
      "https://jobs.ashbyhq.com/Hyperliquid%20Labs",
      "ashby",
      "jobs.ashbyhq.com",
      "Hyperliquid Labs",
    ],
    [
      "https://jobs.ashbyhq.com/%48yperliquid Labs/?utm_source=test#jobs",
      "ashby",
      "jobs.ashbyhq.com",
      "Hyperliquid Labs",
    ],
    ["https://jobs.ashbyhq.com/ramp%20jobs", "ashby", "jobs.ashbyhq.com", "ramp jobs"],
    [
      " https://JOBS.ASHBYHQ.COM/%72amp/?utm_source=test#jobs ",
      "ashby",
      "jobs.ashbyhq.com",
      "ramp",
    ],
    ["HTTPS://jobs.ashbyhq.com:443/ramp", "ashby", "jobs.ashbyhq.com", "ramp"],
    ["\thttps://jobs.ashbyhq.com/ramp \n", "ashby", "jobs.ashbyhq.com", "ramp"],
    ["https://jobs.lever.co/moonpay", "lever", "jobs.lever.co", "moonpay"],
    ["https://jobs.lever.co:0443/moonpay/?team=eng", "lever", "jobs.lever.co", "moonpay"],
    [
      "https://JOBS.EU.LEVER.CO/ExampleCompany/#openings",
      "lever",
      "jobs.eu.lever.co",
      "ExampleCompany",
    ],
    [
      "https://jobs.ashbyhq.com/%41cme%2D%2E%5F%7e0123",
      "ashby",
      "jobs.ashbyhq.com",
      "Acme-._~0123",
    ],
  ])("identifies %s", (input, provider, sourceHost, boardKey) => {
    expect(identifyBoardUrl(input)).toEqual({
      success: true,
      source: {
        provider,
        sourceHost,
        boardKey,
        canonicalUrl: `https://${sourceHost}/${encodeURIComponent(boardKey)}`,
      },
    });
  });

  it("keeps case and Lever region as distinct source identities", () => {
    const urls = [
      "https://jobs.lever.co/ExampleCompany",
      "https://jobs.lever.co/examplecompany",
      "https://jobs.eu.lever.co/ExampleCompany",
    ];
    const canonicalUrls = urls.map((input) => {
      const result = identifyBoardUrl(input);
      expect(result.success).toBe(true);
      return result.success ? result.source.canonicalUrl : undefined;
    });

    expect(canonicalUrls).toEqual(urls);
    expect(new Set(canonicalUrls).size).toBe(3);
  });

  it.each([
    "",
    "jobs.ashbyhq.com/ramp",
    "/ramp",
    "http://jobs.ashbyhq.com/ramp",
    "javascript:alert(1)",
    "file:///ramp",
    "https:jobs.ashbyhq.com/ramp",
    "https:////jobs.ashbyhq.com/ramp",
    "https://jobs.ashbyhq.com",
    "https://jobs.ashbyhq.com/",
    "https://jobs.ashbyhq.com//ramp",
    "https://jobs.ashbyhq.com/ramp//",
    "https://jobs.ashbyhq.com/ramp/posting-id",
    "https://jobs.lever.co/moonpay/posting-id/apply",
    "https://jobs.ashbyhq.com/./ramp",
    "https://jobs.ashbyhq.com/other/../ramp",
    "https://jobs.ashbyhq.com/%2e/ramp",
    "https://jobs.ashbyhq.com/.",
    "https://jobs.ashbyhq.com/..",
    "https://jobs.ashbyhq.com/%2e%2E",
    "https://jobs.ashbyhq.com/ramp%2fposting-id",
    "https://jobs.ashbyhq.com/ramp%5cposting-id",
    "https://jobs.ashbyhq.com/ramp%252fposting-id",
    "https://jobs.ashbyhq.com/ramp%3fquery",
    "https://jobs.ashbyhq.com/ramp%23fragment",
    "https://jobs.ashbyhq.com/%20",
    "https://jobs.ashbyhq.com/%20ramp",
    "https://jobs.ashbyhq.com/ramp%20",
    "https://jobs.ashbyhq.com/ramp%09jobs",
    "https://jobs.ashbyhq.com/ramp%C2%A0jobs",
    "https://jobs.ashbyhq.com/%00ramp",
    "https://jobs.ashbyhq.com/%C3%A9",
    "https://jobs.ashbyhq.com/café",
    "https://jobs.ashbyhq.com/%",
    "https://jobs.ashbyhq.com/%7",
    "https://jobs.ashbyhq.com/%GG",
    "https://jobs.ashbyhq.com/%C3",
    "https://jobs.ashbyhq.com/ra\tmp",
    "https://jobs.ashbyhq.com/ra\nmp",
    "https://jobs.ashbyhq.com/ra\u007fmp",
    "https://jobs.ashbyhq.com/ra\\mp",
    "https://jobs.ashbyhq.com/ramp?query=\\other",
    "https://user:password@jobs.ashbyhq.com/ramp",
    "https://@jobs.ashbyhq.com/ramp",
    "https://jobs.ashbyhq.com:444/ramp",
    "https://jobs.ashbyhq.com:invalid/ramp",
    "https://jobs.ashbyhq.com:/ramp",
    "https://%6aobs.ashbyhq.com/ramp",
    "https://jobs.ashbyhq.com.evil.example/ramp",
    "https://evil.jobs.ashbyhq.com/ramp",
    "https://jobs.ashbyhq.com./ramp",
    "https://jobs-ashbyhq.com/ramp",
    "https://careers.example.com/ramp",
    "https://evil.example/jobs.ashbyhq.com/ramp",
    "https://jobs.ashbyhq.com@evil.example/ramp",
  ])("rejects unsupported or ambiguous input %j", (input) => {
    expect(identifyBoardUrl(input)).toEqual({
      success: false,
      message: expect.stringContaining("https://jobs.ashbyhq.com/ramp"),
    });
  });

  it("bounds the complete URL input", () => {
    const root = "https://jobs.ashbyhq.com/";
    const atLimit = root + "a".repeat(2048 - root.length);
    expect(identifyBoardUrl(atLimit).success).toBe(true);
    expect(identifyBoardUrl(atLimit + "a").success).toBe(false);
    expect(identifyBoardUrl(root + "a ".repeat(600) + "a").success).toBe(false);
  });
});

describe("cleanBoardUrl", () => {
  it.each([
    [
      " https://JOBS.ASHBYHQ.COM:443/Hyperliquid%20Labs/?utm_source=test&cookie=consent#jobs ",
      "https://jobs.ashbyhq.com/Hyperliquid%20Labs",
    ],
    [
      `https://jobs.ashbyhq.com/ramp/?tracking=${"a".repeat(2500)}#jobs`,
      "https://jobs.ashbyhq.com/ramp",
    ],
    ["https://jobs.lever.co/moonpay?team=eng#jobs", "https://jobs.lever.co/moonpay"],
    [
      "https://JOBS.EU.LEVER.CO/ExampleCompany/?ref=test#openings",
      "https://jobs.eu.lever.co/ExampleCompany",
    ],
  ])("removes copied tracking data and stays idempotent (%#)", (input, expected) => {
    expect(cleanBoardUrl(input)).toBe(expected);
    expect(cleanBoardUrl(expected)).toBe(expected);
  });

  it.each([
    "https://jobs.ashbyhq.com/ramp/posting-id?ref=test#apply",
    "https://jobs.ashbyhq.com/ramp%2fposting-id?ref=test",
    "https://user:password@jobs.ashbyhq.com/ramp?ref=test",
    "https://jobs.ashbyhq.com.evil.example/ramp?ref=test",
    "not a board URL",
  ])("keeps unsupported input available for correction: %s", (input) => {
    expect(cleanBoardUrl(input)).toBe(input);
  });
});
