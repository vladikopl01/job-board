"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RefreshNotice } from "@/features/refresh/refresh-provider";
import { WorkspaceFooterContext } from "@/components/workspace-footer";

export function AppShell({
  children,
  defaultSidebarOpen = true,
}: {
  children: ReactNode;
  defaultSidebarOpen?: boolean;
}) {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const main = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (previousPath.current !== pathname) {
      scroll.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
      main.current?.focus({ preventScroll: true });
    }
    previousPath.current = pathname;
  }, [pathname]);
  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={defaultSidebarOpen}
        data-app-shell
        className="h-dvh min-h-0 overflow-hidden"
      >
        <AppSidebar />
        <SidebarInset
          ref={main}
          id="main-content"
          tabIndex={-1}
          className="min-h-0 min-w-0 overflow-hidden outline-none"
        >
          <header className="flex min-h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
            <SidebarTrigger size="icon" />
            <Separator
              orientation="vertical"
              className="data-vertical:h-4 data-vertical:self-auto"
            />
            <AppBreadcrumbs pathname={pathname} />
          </header>
          <WorkspaceFooterContext value={footer}>
            <div
              ref={scroll}
              data-workspace-scroll
              className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] sm:p-6 lg:p-8"
            >
              <RefreshNotice />
              {children}
            </div>
            <div ref={setFooter} data-workspace-footer className="shrink-0 empty:hidden" />
          </WorkspaceFooterContext>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
