"use client";

import { cn } from "cn";
import type { ReactNode } from "react";

import { useCollectionVirtualizer } from "./use-collection-virtualizer";

export function VirtualCollection<T extends { id: string }>({
  items,
  cards,
  label,
  estimateSize,
  activeId,
  children,
}: {
  items: T[];
  cards: boolean;
  label: string;
  estimateSize: number;
  activeId?: string | null | undefined;
  children: (item: T) => ReactNode;
}) {
  const {
    ref,
    columns,
    enabled,
    items: virtualRows,
    totalSize,
    scrollMargin,
    measureElement,
    onFocusCapture,
  } = useCollectionVirtualizer<HTMLUListElement, HTMLLIElement>({
    keys: items.map((item) => item.id),
    cards,
    estimateSize,
    gap: 12,
    activeId,
  });
  return (
    <ul
      ref={ref}
      aria-label={label}
      onFocusCapture={onFocusCapture}
      data-virtualized={enabled || undefined}
      className={cn("relative min-w-0", !enabled && "flex flex-col gap-3")}
      style={enabled ? { height: totalSize } : undefined}
    >
      {virtualRows.map((row) => (
        <li
          key={row.key}
          role="presentation"
          data-index={row.index}
          ref={enabled ? measureElement : undefined}
          className="min-w-0"
          style={{
            ...(enabled
              ? {
                  position: "absolute",
                  top: row.start - scrollMargin,
                  insetInline: 0,
                }
              : {}),
          }}
        >
          <ul
            role="presentation"
            className="grid min-w-0 gap-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {items.slice(row.index * columns, (row.index + 1) * columns).map((item, offset) => (
              <li
                key={item.id}
                data-virtual-key={item.id}
                aria-setsize={items.length}
                aria-posinset={row.index * columns + offset + 1}
                className="min-w-0 [&>article]:h-full"
              >
                {children(item)}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
