"use client";

import { InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export function InfoTip({ label, children }: { label: string; children: string }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label={label}
          />
        }
      >
        <InfoIcon aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 max-w-(--available-width)">
        <PopoverTitle className="sr-only">{label}</PopoverTitle>
        <PopoverDescription>{children}</PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
