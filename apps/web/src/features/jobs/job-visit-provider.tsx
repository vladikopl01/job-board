"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";

function createVisit(pathname: string | null, postingId?: string) {
  let consumed = false;
  return {
    pathname,
    postingId,
    consume(id: string) {
      if (consumed || (postingId ? postingId !== id : pathname !== `/jobs/${id}`)) return false;
      consumed = true;
      return true;
    },
  };
}

const JobVisitContext = createContext<ReturnType<typeof createVisit> | null>(null);

export function JobVisitProvider({
  children,
  postingId,
}: {
  children: ReactNode;
  postingId?: string;
}) {
  const pathname = usePathname();
  const [visit, setVisit] = useState(() => createVisit(pathname, postingId));
  // Reset on real route entry, even when Next retains an earlier details component.
  if (visit.pathname !== pathname || visit.postingId !== postingId)
    setVisit(createVisit(pathname, postingId));
  return <JobVisitContext value={visit}>{children}</JobVisitContext>;
}

export function useJobVisit() {
  const visit = useContext(JobVisitContext);
  if (!visit) throw new Error("Job details require JobVisitProvider.");
  return visit;
}
