import type { Metadata } from "next";
import type { ReactNode } from "react";

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
        <header className="border-b px-5 py-5 sm:px-8">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <span className="font-semibold tracking-tight">Job board</span>
            <span className="text-sm text-muted-foreground">Local workspace</span>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-20"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
