import type { CollectionLayout } from "@/components/collection/collection-views";
import type { ReactTable } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { handleCollectionRowClick } from "@/components/collection/row-navigation";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { VirtualCollection } from "@/components/collection/virtual-collection";

import { BoardRow } from "./board-row";
import type { Board } from "./schemas";

export function BoardsCollection({
  boards,
  table,
  layout,
  label,
  onStatus,
  activeId,
}: {
  boards: Board[];
  table: ReactTable<DataTableFeatures, Board, unknown>;
  layout: CollectionLayout;
  label: string;
  onStatus: (message: string, origin?: Element) => void;
  activeId?: string | null;
}) {
  if (layout !== "table")
    return (
      <VirtualCollection
        items={boards}
        cards={layout === "cards"}
        label={label}
        estimateSize={180}
        activeId={activeId}
      >
        {(board) => (
          <BoardRow
            presentation={layout === "cards" ? "card" : "list"}
            board={board}
            onStatus={onStatus}
          />
        )}
      </VirtualCollection>
    );
  return (
    <DataTable
      table={table}
      aria-label={label}
      pagination={null}
      activeRowId={activeId}
      getRowProps={(board) => ({
        id: `board-${board.id}`,
        tabIndex: -1,
        className: "cursor-pointer",
        onClick: handleCollectionRowClick,
      })}
      className="min-w-0"
    />
  );
}
