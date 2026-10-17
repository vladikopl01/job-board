"use client";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="flex max-w-lg flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">We couldn’t load your workspace</h1>
      <p className="text-muted-foreground">Try again to open this page.</p>
      <Button type="button" onClick={reset} size="lg">
        Try again
      </Button>
    </div>
  );
}
