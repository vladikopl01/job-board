"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { QueryProvider } from "@/components/query-provider";
import { RefreshProvider } from "@/features/refresh/refresh-provider";
import { JobVisitProvider } from "@/features/jobs/job-visit-provider";

export function WorkspaceProviders({
  children,
  defaultSidebarOpen = true,
}: {
  children: ReactNode;
  defaultSidebarOpen?: boolean;
}) {
  const pathname = usePathname();
  // Fixture routes share fonts and tokens without mounting queries or app-visit refreshes.
  if (pathname.startsWith("/dev/")) return children;
  return (
    <QueryProvider>
      <JobVisitProvider>
        <RefreshProvider>
          <AppShell defaultSidebarOpen={defaultSidebarOpen}>{children}</AppShell>
        </RefreshProvider>
      </JobVisitProvider>
    </QueryProvider>
  );
}
