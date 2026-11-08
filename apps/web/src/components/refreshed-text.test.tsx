// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { RefreshedText } from "./refreshed-text";

const originalAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "animate");

function mockMotion(reduced: boolean) {
  const cancel = vi.fn<() => void>();
  const animate = vi.fn<(...args: Parameters<HTMLElement["animate"]>) => Pick<Animation, "cancel">>(
    () => ({ cancel }),
  );
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reduced })),
  );
  return { animate, cancel };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (originalAnimate) Object.defineProperty(HTMLElement.prototype, "animate", originalAnimate);
  else Reflect.deleteProperty(HTMLElement.prototype, "animate");
});

it("keeps text mounted and animates only a new completed revision, including identical text", () => {
  const { animate, cancel } = mockMotion(false);
  const { rerender, unmount } = render(
    <RefreshedText revision="first">Up to date · 3 cached</RefreshedText>,
  );
  const result = screen.getByText("Up to date · 3 cached");
  expect(animate).not.toHaveBeenCalled();
  rerender(<RefreshedText revision="first">Up to date · 3 cached</RefreshedText>);
  expect(animate).not.toHaveBeenCalled();
  rerender(<RefreshedText revision="second">Up to date · 3 cached</RefreshedText>);
  expect(screen.getByText("Up to date · 3 cached")).toBe(result);
  expect(animate).toHaveBeenCalledExactlyOnceWith(
    [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }],
    { duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
  );
  unmount();
  expect(cancel).toHaveBeenCalledOnce();
});

it("keeps completed text visible without animation when reduced motion is preferred", () => {
  const { animate } = mockMotion(true);
  const { rerender } = render(<RefreshedText revision="first">3 cached</RefreshedText>);
  rerender(<RefreshedText revision="second">4 cached</RefreshedText>);
  expect(screen.getByText("4 cached")).toBeInTheDocument();
  expect(animate).not.toHaveBeenCalled();
});
