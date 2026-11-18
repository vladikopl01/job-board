import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";

const appBadgeVariants = cva("border-border [a]:hover:bg-accent [a]:hover:text-accent-foreground", {
  variants: {
    variant: {
      neutral: "bg-background text-foreground",
      muted: "bg-muted text-muted-foreground-strong",
      counter: "border-transparent bg-emphasis text-emphasis-foreground",
      unread: "bg-emphasis text-emphasis-foreground",
      ashby: "border-provider-ashby-foreground/20 bg-provider-ashby text-provider-ashby-foreground",
      lever: "border-provider-lever-foreground/20 bg-provider-lever text-provider-lever-foreground",
      success: "border-success-foreground/20 bg-success text-success-foreground",
    },
  },
  defaultVariants: { variant: "neutral" },
});

// Every application badge shares the preset's geometry; variants change colors only.
export function AppBadge({
  variant,
  className,
  ...props
}: Omit<ComponentProps<typeof Badge>, "variant"> & VariantProps<typeof appBadgeVariants>) {
  return (
    <Badge
      variant="secondary"
      className={cn(appBadgeVariants({ variant }), className)}
      {...props}
    />
  );
}
