// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { setupCollectionControls } from "../../test/collection-controls";
import { inboxApi } from "../../test/inbox-browser";
import { AppSidebar } from "./app-sidebar";
import { ThemeProvider } from "./theme-provider";
import { SidebarProvider } from "./ui/sidebar";
import { TooltipProvider } from "./ui/tooltip";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.style.removeProperty("color-scheme");
  vi.unstubAllGlobals();
});

function systemPreference(dark = false) {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const preference = {
    matches: dark,
    addListener: (listener: (event: { matches: boolean }) => void) => listeners.add(listener),
    removeListener: (listener: (event: { matches: boolean }) => void) => listeners.delete(listener),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) =>
      query === "(prefers-color-scheme: dark)"
        ? preference
        : {
            matches: false,
            addEventListener: vi.fn<() => void>(),
            removeEventListener: vi.fn<() => void>(),
          },
    ),
  );
  return (matches: boolean) => {
    preference.matches = matches;
    for (const listener of [...listeners]) listener({ matches });
  };
}

function workspace(defaultOpen = true) {
  setupCollectionControls();
  inboxApi([]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

it("applies light and dark choices and restores the saved appearance on a later visit", async () => {
  systemPreference();
  const view = workspace();
  const user = userEvent.setup();
  const trigger = screen.getByRole("button", { name: "Settings" });
  expect(trigger.closest('[data-slot="sidebar-footer"]')).toBeInTheDocument();
  await user.click(trigger);
  const settings = await screen.findByRole("dialog", { name: "Settings" });
  const dark = within(settings).getByRole("button", { name: "Dark" });
  await user.click(dark);
  expect(document.documentElement).toHaveClass("dark");
  expect(document.documentElement.style.colorScheme).toBe("dark");
  expect(localStorage.getItem("job-board:theme:v1")).toBe("dark");
  await user.click(dark);
  expect(dark).toHaveAttribute("aria-pressed", "true");
  await user.click(within(settings).getByRole("button", { name: "Light" }));
  expect(document.documentElement).toHaveClass("light");
  expect(document.documentElement).not.toHaveClass("dark");
  await user.click(dark);
  view.unmount();
  workspace();
  await user.click(screen.getByRole("button", { name: "Settings" }));
  const restored = await screen.findByRole("dialog", { name: "Settings" });
  expect(within(restored).getByRole("button", { name: "Dark" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(document.documentElement).toHaveClass("dark");
});

it("follows OS appearance changes only while System is selected", async () => {
  const setSystemDark = systemPreference(true);
  workspace();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Settings" }));
  const settings = await screen.findByRole("dialog", { name: "Settings" });
  const system = within(settings).getByRole("button", { name: "System" });
  expect(system).toHaveAttribute("aria-pressed", "true");
  expect(document.documentElement).toHaveClass("dark");
  act(() => setSystemDark(false));
  expect(document.documentElement).toHaveClass("light");
  await user.click(within(settings).getByRole("button", { name: "Dark" }));
  act(() => setSystemDark(true));
  act(() => setSystemDark(false));
  expect(document.documentElement).toHaveClass("dark");
  await user.click(system);
  expect(document.documentElement).toHaveClass("light");
  expect(localStorage.getItem("job-board:theme:v1")).toBe("system");
});

it("keeps settings usable by keyboard in the collapsed sidebar and restores focus on Escape", async () => {
  systemPreference();
  workspace(false);
  const user = userEvent.setup();
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
    "data-state",
    "collapsed",
  );
  const trigger = screen.getByRole("button", { name: "Settings" });
  trigger.focus();
  await user.keyboard("{Enter}");
  const settings = await screen.findByRole("dialog", { name: "Settings" });
  within(settings).getByRole("button", { name: "System" }).focus();
  await user.keyboard("{ArrowLeft}");
  expect(within(settings).getByRole("button", { name: "Dark" })).toHaveFocus();
  await user.keyboard(" ");
  expect(document.documentElement).toHaveClass("dark");
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
});
