"use client";

import { useEffect, useRef } from "react";

// Only explicit pagination moves focus; filtering and background refreshes keep it in place.
export function usePageFocus({ scope, pending }: { scope: string; pending: boolean }) {
  const results = useRef<HTMLElement>(null);
  const request = useRef<{ from: string; to: string } | null>(null);
  useEffect(() => {
    if (!request.current) return;
    if (scope !== request.current.to) {
      if (scope !== request.current.from) request.current = null;
      return;
    }
    if (pending) return;
    request.current = null;
    results.current?.focus({ preventScroll: true });
    results.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [scope, pending]);
  return {
    results,
    requestPageFocus: (to: string) => {
      request.current = { from: scope, to };
    },
  };
}
