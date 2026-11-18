"use client";

import type { Ref } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Faceted,
  FacetedContent,
  FacetedEmpty,
  FacetedGroup,
  FacetedInput,
  FacetedItem,
  FacetedList,
  FacetedTrigger,
} from "@/components/ui/faceted";

export function DataTableFieldPicker({
  kind,
  fields,
  disabled,
  onSelect,
  ref,
}: {
  kind: "filter" | "sort";
  fields: { id: string; label: string }[];
  disabled?: boolean;
  onSelect: (id: string) => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <Faceted
      value=""
      onValueChange={(id) => {
        if (id) onSelect(id);
      }}
    >
      <FacetedTrigger
        render={<Button ref={ref} variant="outline" disabled={disabled || fields.length === 0} />}
      >
        Add {kind}
        <ChevronDown aria-hidden="true" data-icon="inline-end" />
      </FacetedTrigger>
      <FacetedContent
        label={`Search ${kind} fields`}
        align="start"
        className="w-64 max-w-(--available-width)"
      >
        <FacetedInput aria-label={`Search ${kind} fields`} placeholder="Search fields…" />
        <FacetedList>
          <FacetedEmpty>No fields found.</FacetedEmpty>
          <FacetedGroup>
            {fields.map((field) => (
              <FacetedItem
                key={field.id}
                value={field.id}
                keywords={[field.label]}
                className="text-xs"
              >
                {field.label}
              </FacetedItem>
            ))}
          </FacetedGroup>
        </FacetedList>
      </FacetedContent>
    </Faceted>
  );
}
