import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { WorkspaceProviders } from "@/components/workspace-providers";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Job board",
  description: "Your local job-search workspace.",
};

export const viewport: Viewport = { viewportFit: "cover" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const defaultSidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <html lang="en" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <body>
        <a
          href="#main-content"
          className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:outline-2 focus:outline-offset-4 focus:outline-ring"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <NuqsAdapter>
            <WorkspaceProviders defaultSidebarOpen={defaultSidebarOpen}>
              {children}
            </WorkspaceProviders>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
