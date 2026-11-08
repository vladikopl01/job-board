"use client";

import { useEffect, useRef } from "react";

export function RefreshedText({
  revision,
  children,
}: {
  revision: string | number;
  children: string;
}) {
  const text = useRef<HTMLSpanElement>(null);
  const previousRevision = useRef(revision);

  useEffect(() => {
    if (previousRevision.current === revision) return;
    previousRevision.current = revision;
    const element = text.current;
    if (
      !element?.animate ||
      !window.matchMedia ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const animation = element.animate([{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], {
      duration: 180,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
    });
    return () => animation.cancel();
  }, [revision]);

  return (
    <span ref={text} data-slot="refreshed-text">
      {children}
    </span>
  );
}
