"use client";

import { Spinner } from "@/components/ui/spinner";

import { useRefreshAllActivity } from "./refresh-provider";

export function RefreshActivity() {
  const refreshing = useRefreshAllActivity();
  return refreshing ? (
    <output className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner aria-hidden="true" />
      Refreshing boards…
    </output>
  ) : null;
}
