import { expect, it, vi } from "vitest";

import { sanitizeDescription } from "./description";

vi.mock("server-only", () => ({}));

it.each([
  "<p> </p>",
  "<p>&nbsp;<br></p>",
  "<ul><li><br></li></ul>",
  "<div><script>hidden()</script></div>",
])("allows plain-text fallback when rich content has no readable text: %s", (html) => {
  expect(sanitizeDescription({ html, jobUrl: "https://example.com/jobs/one" })).toBeNull();
});

it("keeps readable rich content and its safe links", () => {
  expect(
    sanitizeDescription({
      html: '<h2>Role</h2><p>Build &amp; learn. <a href="/team">Meet us</a></p>',
      jobUrl: "https://example.com/jobs/one",
    }),
  ).toBe(
    '<h2>Role</h2><p>Build &amp; learn. <a href="https://example.com/team" target="_blank" rel="noopener noreferrer">Meet us</a></p>',
  );
});
