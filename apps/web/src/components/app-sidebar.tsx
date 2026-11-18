"use client";

import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import { SettingsPopover } from "@/components/settings-popover";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";

// The official sidebar-08 inset composition, with local workspace navigation.
export function AppSidebar() {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="h-14 shrink-0 justify-center px-4 group-data-[collapsible=icon]:hidden">
        <Link
          href="/dashboard"
          className="w-fit rounded-sm text-lg font-semibold tracking-tight outline-ring focus-visible:outline-2 focus-visible:outline-offset-4 group-data-[collapsible=icon]:hidden"
        >
          Job board
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <AppNav />
      </SidebarContent>
      <SidebarFooter className="gap-3">
        <p className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Local workspace
        </p>
        <SettingsPopover />
      </SidebarFooter>
    </Sidebar>
  );
}
