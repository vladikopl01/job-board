import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import RootLayout from "./layout";

const requestCookies = vi.hoisted(() => ({
  get: vi.fn<(name: string) => { value: string } | undefined>(),
}));
vi.mock("next/headers", () => ({ cookies: async () => requestCookies }));
vi.mock("next/font/google", () => ({ Inter: () => ({ variable: "--font-sans" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("nuqs/adapters/next/app", () => ({
  NuqsAdapter: ({ children }: { children: ReactNode }) => children,
}));

it.each([
  { value: "false", state: "collapsed" },
  { value: "true", state: "expanded" },
  { value: undefined, state: "expanded" },
  { value: "invalid", state: "expanded" },
])(
  "renders a fresh request with saved sidebar $value as $state before hydration",
  async ({ value, state }) => {
    requestCookies.get.mockReturnValue(value === undefined ? undefined : { value });
    const html = renderToString(await RootLayout({ children: <h1>Dashboard</h1> }));
    const sidebar = html.match(/<div\b[^>]*data-slot="sidebar"[^>]*>/u)?.[0];
    expect(sidebar).toContain(`data-state="${state}"`);
    expect(requestCookies.get).toHaveBeenCalledWith("sidebar_state");
  },
);
