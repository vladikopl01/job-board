"use client";

import { notFound } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { JobCard } from "@/features/jobs/job-card";
import type { JobListItem } from "@/features/jobs/schemas";

const fixture: JobListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  boardId: "22222222-2222-4222-8222-222222222222",
  title: "Engineering Manager — Growth Product",
  company: "Example company",
  provider: "ashby",
  sourceHost: "jobs.ashbyhq.com",
  canonicalUrl: "https://jobs.ashbyhq.com/example",
  applyUrl: "https://jobs.ashbyhq.com/example/source-one/application",
  boardArchivedAt: null,
  locations: [{ text: "United States", country: "USA", address: null }],
  workplaceType: "remote",
  department: "Engineering",
  team: null,
  firstSeenAt: "2026-11-11T10:00:00.000Z",
  readAt: null,
  unavailableAt: null,
  unavailableReason: null,
};
const places = [
  "United States",
  "United Arab Emirates",
  "Brazil",
  "Ireland",
  "Poland",
  "Peru",
  "대한민국",
  "日本",
  "Deutschland",
  "España",
  "México",
  "Colombia",
  "Argentina",
  "Latvija",
  "Sverige",
];
const locations = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    text: places[index % places.length] ?? "Location",
    country: null,
    address: null,
  }));
type Scenario = {
  label: string;
  job?: Partial<JobListItem>;
  width?: number;
  state?: "selected" | "selecting" | "disabled" | "pending" | "active" | "history";
  squeezed?: boolean;
};
const scenarios: Scenario[] = [
  { label: "Empty title", job: { title: "" } },
  { label: "One word", job: { title: "Engineer" } },
  { label: "Typical content" },
  {
    label: "Several sentences",
    job: {
      title:
        "Senior engineering leader for the global payments platform. Build the infrastructure for the next generation of reliable financial products.",
    },
  },
  {
    label: "Unbreakable 120-character title",
    job: { title: "Donaudampfschifffahrtsgesellschaft".repeat(4) },
  },
  { label: "Emoji only", job: { title: "👩🏽‍💻🌍🚀" } },
  { label: "Emoji mixed with text", job: { title: "Engineering 👩🏽‍💻 — Payments 🌍" } },
  { label: "Arabic RTL", job: { title: "مهندس برمجيات أول — منصة المدفوعات العالمية" } },
  { label: "Mixed directions", job: { title: "مهندس أول — Payments API (Berlin)" } },
  {
    label: "Diacritics and tall scripts",
    job: { title: "Đặng Nguyễn — ผู้จัดการฝ่ายวิศวกรรม — हिन्दी" },
  },
  { label: "Zero locations", job: { locations: [], workplaceType: "unknown" } },
  { label: "One location" },
  { label: "15 locations", job: { locations: locations(15) } },
  { label: "150 locations", job: { locations: locations(150) } },
  { label: "320px container", width: 320 },
  { label: "Squeezed by a grid sibling", squeezed: true },
  { label: "1200px container", width: 1200 },
  { label: "Read posting", job: { readAt: "2026-11-11T12:00:00.000Z" } },
  { label: "Selection mode, unselected", state: "selecting" },
  { label: "Selection mode, selected", state: "selected" },
  { label: "Selection disabled", state: "disabled" },
  { label: "Read write pending", state: "pending" },
  { label: "Active in reader", state: "active" },
  {
    label: "Historical and archived",
    state: "history",
    job: {
      unavailableAt: "2026-11-11T12:00:00.000Z",
      unavailableReason: "missing",
      boardArchivedAt: "2026-11-11T12:00:00.000Z",
    },
  },
];

export default function JobCardReport() {
  const [message, setMessage] = useState("");
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <main id="main-content" className="flex min-w-0 flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">JobCard stress test</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Real component, static fixtures. Tab through the links and actions; try browser zoom, dark
          mode and reduced motion. Actions only update the message on this page.
        </p>
        <output className="text-sm" aria-live="polite">
          {message}
        </output>
      </header>
      {scenarios.map((scenario) => (
        <section key={scenario.label} className="flex min-w-0 flex-col gap-2">
          <h2 className="text-sm font-medium">{scenario.label}</h2>
          <p className="text-xs text-muted-foreground">Awaiting visual observation.</p>
          <div
            className="overflow-x-auto p-1"
            onClickCapture={(event) => {
              if (event.target instanceof Element && event.target.closest("a")) {
                event.preventDefault();
                setMessage(`${scenario.label}: link action`);
              }
            }}
          >
            <div
              style={{ width: scenario.squeezed ? 320 : (scenario.width ?? 320) }}
              className={
                scenario.squeezed ? "grid grid-cols-[minmax(0,1fr)_7rem] gap-2" : undefined
              }
            >
              <FixtureCard scenario={scenario} onAction={setMessage} />
              {scenario.squeezed ? (
                <span className="text-xs text-muted-foreground">Grid sibling</span>
              ) : null}
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}

function FixtureCard({
  scenario,
  onAction,
}: {
  scenario: Scenario;
  onAction: (message: string) => void;
}) {
  const [selected, setSelected] = useState(scenario.state === "selected");
  const selecting =
    scenario.state === "selecting" ||
    scenario.state === "selected" ||
    scenario.state === "disabled";
  const props = {
    job: { ...fixture, ...scenario.job },
    presentation: "card",
    showReadStatus: true,
    history: scenario.state === "history",
    active: scenario.state === "active",
    readPending: scenario.state === "pending",
    selection: selecting
      ? {
          selected,
          disabled: scenario.state === "disabled",
          onSelect: () => setSelected((value) => !value),
        }
      : null,
    onRead: () => onAction(`${scenario.label}: read action`),
    onOpen: () => onAction(`${scenario.label}: open action`),
    href: "#main-content",
  } satisfies ComponentProps<typeof JobCard>;
  return <JobCard {...props} />;
}
