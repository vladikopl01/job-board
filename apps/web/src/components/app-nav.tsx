"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Workspace" },
  { href: "/boards", label: "Boards" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-wrap gap-1 text-sm">
      {links.map(({ href, label }) => {
        const active = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 font-medium outline-ring transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2",
              active ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
