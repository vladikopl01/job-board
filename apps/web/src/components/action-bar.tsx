"use client";

import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar";
import { cn } from "cn";
import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function ActionBar({ className, open, ...props }: ToolbarPrimitive.Root.Props & { open: boolean }) {
  return (
    <ToolbarPrimitive.Root
      data-slot="action-bar"
      data-state={open ? "open" : "closed"}
      inert={!open}
      aria-hidden={!open}
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2 border-b px-4 py-2 data-[state=closed]:hidden sm:px-6",
        className,
      )}
      {...props}
    />
  );
}

function ActionBarSelection({ className, ...props }: ToolbarPrimitive.Group.Props) {
  return (
    <ToolbarPrimitive.Group
      data-slot="action-bar-selection"
      className={cn("flex h-7 min-w-0 max-w-full items-center rounded-md border", className)}
      {...props}
    />
  );
}

function ActionBarSelectionCount({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="action-bar-selection-count"
      aria-live="polite"
      aria-atomic="true"
      className={cn("w-[11ch] min-w-0 px-2 text-center text-xs tabular-nums", className)}
      {...props}
    />
  );
}

function ActionBarGroup({ className, ...props }: ToolbarPrimitive.Group.Props) {
  return (
    <ToolbarPrimitive.Group
      data-slot="action-bar-group"
      className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}
      {...props}
    />
  );
}

function ActionBarItem({
  className,
  variant = "outline",
  size = "default",
  focusableWhenDisabled = true,
  ...props
}: ToolbarPrimitive.Button.Props & Pick<ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <ToolbarPrimitive.Button
      data-slot="action-bar-item"
      focusableWhenDisabled={focusableWhenDisabled}
      // Visibility must change with the surface, without a child's inherited transition-all.
      className={cn(
        "max-w-full transition-none aria-disabled:opacity-50 active:not-aria-[haspopup]:translate-y-0",
        className,
      )}
      render={
        <Button variant={variant} size={size} focusableWhenDisabled={focusableWhenDisabled} />
      }
      {...props}
    />
  );
}

function ActionBarSelectionClear({ className, ...props }: ComponentProps<typeof ActionBarItem>) {
  return (
    <ActionBarItem
      data-slot="action-bar-selection-clear"
      variant="ghost"
      size="icon-sm"
      aria-label="Clear selection"
      className={cn("rounded-none rounded-e-md border-s-border", className)}
      {...props}
    >
      <XIcon aria-hidden="true" />
    </ActionBarItem>
  );
}

function ActionBarClose(props: ComponentProps<typeof ActionBarItem>) {
  return <ActionBarItem data-slot="action-bar-close" variant="ghost" {...props} />;
}

function ActionBarSeparator({ className, ...props }: ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="action-bar-separator"
      orientation="vertical"
      aria-hidden="true"
      className={cn("hidden sm:block", className)}
      {...props}
    />
  );
}

export {
  ActionBar,
  ActionBarSelection,
  ActionBarSelectionCount,
  ActionBarSelectionClear,
  ActionBarGroup,
  ActionBarItem,
  ActionBarClose,
  ActionBarSeparator,
};
