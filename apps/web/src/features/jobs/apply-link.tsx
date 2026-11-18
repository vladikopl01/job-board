import { cn } from "cn";
import { SendIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { JobListItem } from "./schemas";

export function ApplyLink({
  applyUrl,
  iconOnly = false,
}: Pick<JobListItem, "applyUrl"> & { iconOnly?: boolean }) {
  const link = (
    <a
      href={applyUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Apply (opens in a new tab)"
      className={cn(buttonVariants({ variant: "outline", size: iconOnly ? "icon" : "default" }))}
    >
      <SendIcon aria-hidden="true" data-icon={iconOnly ? undefined : "inline-start"} />
      {iconOnly ? null : "Apply"}
    </a>
  );
  return iconOnly ? (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent>Apply</TooltipContent>
    </Tooltip>
  ) : (
    link
  );
}
