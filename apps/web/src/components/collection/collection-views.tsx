"use client";

import { LayoutGridIcon, ListIcon, Table2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const collectionLayouts = ["list", "cards", "table"] as const;
export type CollectionLayout = (typeof collectionLayouts)[number];
const layouts = [
  { value: "list", label: "List", icon: ListIcon },
  { value: "cards", label: "Cards", icon: LayoutGridIcon },
  { value: "table", label: "Table", icon: Table2Icon },
] satisfies { value: CollectionLayout; label: string; icon: typeof ListIcon }[];

export function CollectionViews({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CollectionLayout;
  onChange: (layout: CollectionLayout) => void;
}) {
  const current = layouts.find((layout) => layout.value === value) ?? {
    value: "table",
    label: "Table",
    icon: Table2Icon,
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${label}: ${current.label}`}
        render={<Button variant="outline" />}
      >
        <current.icon aria-hidden="true" data-icon="inline-start" />
        {current.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next) => {
              if (next === "list" || next === "cards" || next === "table") onChange(next);
            }}
          >
            {layouts.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                <Icon aria-hidden="true" />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
