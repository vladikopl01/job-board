"use client";

import { createContext, use, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const WorkspaceFooterContext = createContext<HTMLDivElement | null>(null);

export function WorkspaceFooter({ children }: { children: ReactNode }) {
  const target = use(WorkspaceFooterContext);
  return target ? createPortal(children, target) : children;
}
