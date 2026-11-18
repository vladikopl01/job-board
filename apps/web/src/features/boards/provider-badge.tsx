import { AppBadge } from "@/components/app-badge";
import type { Board } from "./schemas";

export function ProviderBadge({
  provider,
  sourceHost,
}: {
  provider: Board["provider"];
  sourceHost: string;
}) {
  return (
    <AppBadge variant={provider}>
      {provider === "ashby" ? "Ashby" : sourceHost === "jobs.eu.lever.co" ? "Lever · EU" : "Lever"}
    </AppBadge>
  );
}
