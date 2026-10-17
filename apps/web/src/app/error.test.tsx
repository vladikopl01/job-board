// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import WorkspaceError from "./error";

afterEach(cleanup);

it("lets a keyboard user retry without exposing error internals", async () => {
  const reset = vi.fn<() => void>();
  const user = userEvent.setup();
  render(<WorkspaceError error={new Error("Private database details")} reset={reset} />);

  expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t load your workspace");
  expect(screen.queryByText("Private database details")).not.toBeInTheDocument();
  await user.tab();
  expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(reset).toHaveBeenCalledTimes(1);
});
