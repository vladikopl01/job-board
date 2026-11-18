import type { Metadata } from "next";

import { DashboardClient } from "@/features/dashboard/dashboard-client";

export const metadata: Metadata = { title: "Dashboard · Job board" };

export default function DashboardPage() {
  return <DashboardClient />;
}
