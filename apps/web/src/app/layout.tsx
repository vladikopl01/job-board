import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { AppNav } from "@/components/app-nav";
import { QueryProvider } from "@/components/query-provider";
import { RefreshProvider } from "@/features/refresh/refresh-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Job board",
  description: "Your local job-search workspace.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:outline-2 focus:outline-offset-4 focus:outline-ring"
        >
          Skip to content
        </a>
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
            <Link
              href="/"
              className="rounded-sm font-semibold tracking-tight outline-ring focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Job board
            </Link>
            <AppNav />
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10"
        >
          <NuqsAdapter>
            <QueryProvider>
              <RefreshProvider>{children}</RefreshProvider>
            </QueryProvider>
          </NuqsAdapter>
        </main>
      </body>
    </html>
  );
}
