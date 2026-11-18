"use client";

import { defaultRangeExtractor, measureElement, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FocusEvent } from "react";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useCollectionVirtualizer<
  TContainer extends HTMLElement,
  TItem extends HTMLElement,
>({
  keys,
  cards = false,
  estimateSize,
  gap = 0,
  activeId,
}: {
  keys: string[];
  cards?: boolean;
  estimateSize: number;
  gap?: number;
  activeId?: string | null | undefined;
}) {
  "use no memo";
  const ref = useRef<TContainer>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [retainedActiveKey, setRetainedActiveKey] = useState(activeId ?? null);
  // The overlay unmounts before focus returns to its last posting.
  if (activeId && activeId !== retainedActiveKey) setRetainedActiveKey(activeId);
  const [viewport, setViewport] = useState<{
    element: HTMLElement;
    height: number;
    width: number;
    margin: number;
  } | null>(null);

  useClientLayoutEffect(() => {
    const container = ref.current;
    const scroll = container?.closest<HTMLElement>("[data-workspace-scroll]");
    if (!container || !scroll) return;
    function measure() {
      if (!container || !scroll) return;
      const next = {
        element: scroll,
        height: scroll.clientHeight,
        width: container.clientWidth,
        margin:
          container.getBoundingClientRect().top -
          scroll.getBoundingClientRect().top +
          scroll.scrollTop -
          scroll.clientTop,
      };
      setViewport((previous) =>
        previous?.element === next.element &&
        previous.height === next.height &&
        previous.width === next.width &&
        previous.margin === next.margin
          ? previous
          : next,
      );
    }
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    // Ancestors can move the collection when toolbar controls wrap or notices appear.
    for (let element: HTMLElement | null = container; element; element = element.parentElement) {
      observer.observe(element);
      if (element === scroll) break;
    }
    return () => observer.disconnect();
  }, []);

  const columns = cards
    ? viewport && viewport.width >= 1024
      ? 3
      : viewport && viewport.width >= 672
        ? 2
        : 1
    : 1;
  const count = Math.ceil(keys.length / columns);
  const enabled = Boolean(viewport?.height);
  const focusedIndex = focusedKey ? keys.indexOf(focusedKey) : -1;
  const activeIndex = retainedActiveKey ? keys.indexOf(retainedActiveKey) : -1;
  const getItemKey = useCallback(
    (index: number) => keys.slice(index * columns, (index + 1) * columns).join(":"),
    [keys, columns],
  );
  const rangeExtractor = useCallback(
    (range: Parameters<typeof defaultRangeExtractor>[0]) => {
      const indices = defaultRangeExtractor(range);
      for (const index of [focusedIndex, activeIndex]) {
        const row = Math.floor(index / columns);
        if (row >= 0 && row < count && !indices.includes(row)) indices.push(row);
      }
      return indices.sort((left, right) => left - right);
    },
    [focusedIndex, activeIndex, columns, count],
  );
  // TanStack Virtual owns its mutable instance and notifies this hook when its range changes.
  // oxlint-disable-next-line react/incompatible-library -- This adapter explicitly opts out of compiler memoization.
  const virtualizer = useVirtualizer<HTMLElement, TItem>({
    count,
    enabled,
    getScrollElement: () => viewport?.element ?? null,
    getItemKey,
    estimateSize: () => estimateSize,
    measureElement: (element, entry, instance) =>
      measureElement(element, entry, instance) || estimateSize,
    scrollMargin: viewport?.margin ?? 0,
    gap,
    overscan: 3,
    rangeExtractor,
    useFlushSync: false,
  });

  function onFocusCapture(event: FocusEvent<TContainer>) {
    const key = event.target.closest<HTMLElement>("[data-virtual-key]")?.dataset.virtualKey;
    if (key) setFocusedKey(key);
    if (!activeId) setRetainedActiveKey(null);
  }

  return {
    ref,
    columns,
    enabled,
    totalSize: virtualizer.getTotalSize(),
    scrollMargin: virtualizer.options.scrollMargin,
    measureElement: virtualizer.measureElement,
    onFocusCapture,
    // SSR and containers without a measurable viewport retain their normal document flow.
    items: enabled
      ? virtualizer.getVirtualItems()
      : Array.from({ length: count }, (_, index) => ({
          index,
          key: getItemKey(index),
          start: 0,
          end: 0,
        })),
  };
}
