import { afterEach, expect, it, vi } from "vitest";

import { getDatabase } from "@/server/database";
import { jobIdentity } from "@/features/jobs/server/service";

import { postingId } from "../../../../test/job-fixtures";
import { generateMetadata } from "./page";

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/server/database", () => ({ getDatabase: vi.fn<typeof getDatabase>() }));
vi.mock("@/features/jobs/server/service", () => ({ jobIdentity: vi.fn<typeof jobIdentity>() }));

afterEach(() => vi.resetAllMocks());

it("names a posting tab from its locally stored title and company", async () => {
  vi.mocked(jobIdentity).mockReturnValue({ title: "Frontend Engineer", company: "Example" });
  expect(await generateMetadata({ params: Promise.resolve({ id: postingId }) })).toEqual({
    title: "Frontend Engineer at Example | Job board",
  });
  expect(jobIdentity).toHaveBeenCalledWith({ db: undefined, id: postingId });
});

it("names missing and invalid postings without reading storage for invalid IDs", async () => {
  expect(await generateMetadata({ params: Promise.resolve({ id: "invalid" }) })).toEqual({
    title: "Posting not found | Job board",
  });
  expect(getDatabase).not.toHaveBeenCalled();
  expect(await generateMetadata({ params: Promise.resolve({ id: postingId }) })).toEqual({
    title: "Posting not found | Job board",
  });
});

it("preserves the page's retry flow when local storage is unavailable", async () => {
  vi.mocked(getDatabase).mockImplementation(() => {
    throw new Error("Storage unavailable");
  });
  expect(await generateMetadata({ params: Promise.resolve({ id: postingId }) })).toEqual({
    title: "Posting | Job board",
  });
});
