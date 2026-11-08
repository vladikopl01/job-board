import { ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";

import { compensationSummary } from "./compensation";
import { employmentLabel, workplaceLabel } from "./labels";
import type { JobDetail } from "./schemas";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium whitespace-pre-wrap wrap-anywhere">{children}</dd>
    </div>
  );
}

export function JobFacts({ job }: { job: JobDetail }) {
  const compensation = job.compensation === null ? null : compensationSummary(job.compensation);
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {job.locations.length ? (
        <Fact label={job.locations.length === 1 ? "Location" : "Locations"}>
          {job.locations.map((location) => location.text).join(", ")}
        </Fact>
      ) : null}
      <Fact label="Workplace">{workplaceLabel(job.workplaceType)}</Fact>
      {job.employmentType ? (
        <Fact label="Employment">{employmentLabel(job.employmentType)}</Fact>
      ) : null}
      {job.department ? <Fact label="Department">{job.department}</Fact> : null}
      {job.team && job.team !== job.department ? <Fact label="Team">{job.team}</Fact> : null}
      {job.compensation !== null ? (
        <Fact label="Compensation">
          {compensation || (
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm underline underline-offset-4 outline-ring focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              See employer posting{" "}
              <ExternalLinkIcon aria-hidden="true" className="inline size-3.5" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </Fact>
      ) : null}
    </dl>
  );
}
