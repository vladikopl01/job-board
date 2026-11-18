import Link from "next/link";
import type { ComponentProps } from "react";

// Keep a real URL for new-tab/modifier clicks while ordinary activation opens the reader.
export function PostingLink({
  onOpen,
  ...props
}: Pick<ComponentProps<typeof Link>, "href" | "children" | "className" | "aria-current"> & {
  onOpen: (() => void) | undefined;
}) {
  return (
    <Link
      data-row-link
      {...props}
      scroll={false}
      onClick={(event) => {
        if (
          !onOpen ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        onOpen();
      }}
    />
  );
}
