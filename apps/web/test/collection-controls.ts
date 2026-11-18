import { screen, waitFor, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";

// JSDOM lacks the layout observers and scrolling used by cmdk/Base UI popovers.
export function setupCollectionControls() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn<() => void>();
  HTMLElement.prototype.scrollTo = vi.fn<() => void>();
}

export async function chooseLayout(
  user: ReturnType<typeof userEvent.setup>,
  collection: "Job" | "Board",
  value: string,
) {
  setupCollectionControls();
  await user.click(
    screen.getByRole("button", { name: new RegExp(`^${collection} layouts:`, "u") }),
  );
  await user.click(await screen.findByRole("menuitemradio", { name: value }));
  await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
}

export async function chooseFilter(
  user: ReturnType<typeof userEvent.setup>,
  property: string,
  value: string,
) {
  setupCollectionControls();
  await user.click(screen.getByRole("button", { name: /^Filter(?: \d+)?$/u }));
  let remove = screen.queryByRole("button", { name: `Remove ${property} filter` });
  if (!remove) {
    await user.click(screen.getByRole("button", { name: "Add filter" }));
    await user.click(await screen.findByRole("option", { name: property }));
    remove = screen.getByRole("button", { name: `Remove ${property} filter` });
  }
  if (value === "All") await user.click(remove);
  else {
    const row = remove.closest("li");
    if (!row) throw new Error("Missing filter condition.");
    await user.click(within(row).getByRole("button", { name: `${property} filter value` }));
    await user.click(await screen.findByRole("option", { name: value }));
  }
  await user.keyboard("{Escape}");
}
