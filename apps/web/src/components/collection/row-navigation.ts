import type { MouseEvent } from "react";

// Row whitespace activates its real link; controls and portal clicks keep their own behavior.
export function handleCollectionRowClick(
  event: MouseEvent<HTMLTableRowElement>,
  onSelect?: () => void,
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const target = event.target;
  if (!(target instanceof Element) || !event.currentTarget.contains(target)) return;
  if (
    target.closest(
      "a, button, input, textarea, select, summary, [role=button], [role=checkbox], [role=switch], [role=link], [contenteditable=true]",
    )
  )
    return;
  if (window.getSelection()?.isCollapsed === false) return;
  if (onSelect) onSelect();
  else event.currentTarget.querySelector<HTMLAnchorElement>("a[data-row-link]")?.click();
}
