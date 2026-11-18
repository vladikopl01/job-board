"use client";

import {
  BriefcaseBusinessIcon,
  InboxIcon,
  LayoutDashboardIcon,
  PanelsTopLeftIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UnreadCount, UnreadCountRetry } from "@/features/jobs/unread-count";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusinessIcon },
  { href: "/boards", label: "Boards", icon: PanelsTopLeftIcon },
];

export function AppNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:pt-3">
      <SidebarGroupContent>
        <nav aria-label="Main navigation">
          <SidebarMenu className="gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={active}
                    tooltip={label}
                    className="h-10 transition-colors group-data-[collapsible=icon]:min-h-0"
                    render={
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onNavigate={() => setOpenMobile(false)}
                      />
                    }
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                    {href === "/inbox" ? (
                      <span className="ms-auto group-data-[collapsible=icon]:hidden">
                        <UnreadCount />
                      </span>
                    ) : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </nav>
        <div className="mt-2 group-data-[collapsible=icon]:hidden">
          <UnreadCountRetry />
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
