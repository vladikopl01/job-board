import { CheckCheckIcon, CheckIcon, MailIcon, MailOpenIcon } from "lucide-react";

import {
  ActionBar,
  ActionBarClose,
  ActionBarGroup,
  ActionBarItem,
  ActionBarSelection,
  ActionBarSelectionClear,
  ActionBarSelectionCount,
} from "@/components/action-bar";

import type { ReadStateInput } from "./schemas";

export function JobActionBar({
  selecting,
  pageIds,
  selectedIds,
  disabled,
  readPending,
  onSelect,
  onRead,
  onDone,
}: {
  selecting: boolean;
  pageIds: string[];
  selectedIds: string[];
  disabled: boolean;
  readPending: boolean;
  onSelect: (ids: string[]) => void;
  onRead: (change: ReadStateInput) => void;
  onDone: () => void;
}) {
  const allSelected = pageIds.length > 0 && selectedIds.length === pageIds.length;
  return (
    <ActionBar
      open={selecting}
      aria-label="Selected jobs"
      onKeyDownCapture={(event) => {
        // Focusable disabled buttons consume keydown before the document listener.
        if (event.key !== "Escape" || readPending) return;
        event.preventDefault();
        onDone();
      }}
    >
      <ActionBarGroup>
        <ActionBarSelection aria-label="Selection">
          <ActionBarSelectionCount>{selectedIds.length} selected</ActionBarSelectionCount>
          <ActionBarSelectionClear
            disabled={disabled || selectedIds.length === 0}
            onClick={() => onSelect([])}
          />
        </ActionBarSelection>
        <ActionBarItem
          aria-label="Select all jobs on this page"
          aria-pressed={allSelected}
          disabled={disabled || pageIds.length === 0}
          onClick={() => onSelect(pageIds)}
        >
          <CheckCheckIcon aria-hidden="true" data-icon="inline-start" />
          Select all
        </ActionBarItem>
      </ActionBarGroup>
      <ActionBarGroup>
        <ActionBarItem
          aria-label="Mark read for selected jobs"
          disabled={disabled || selectedIds.length === 0}
          onClick={() => onRead({ ids: selectedIds, read: true })}
        >
          <MailOpenIcon aria-hidden="true" data-icon="inline-start" />
          Mark read
        </ActionBarItem>
        <ActionBarItem
          aria-label="Mark unread for selected jobs"
          disabled={disabled || selectedIds.length === 0}
          onClick={() => onRead({ ids: selectedIds, read: false })}
        >
          <MailIcon aria-hidden="true" data-icon="inline-start" />
          Mark unread
        </ActionBarItem>
        <ActionBarClose className="ms-auto" disabled={readPending} onClick={onDone}>
          <CheckIcon aria-hidden="true" data-icon="inline-start" />
          Done
        </ActionBarClose>
      </ActionBarGroup>
    </ActionBar>
  );
}
