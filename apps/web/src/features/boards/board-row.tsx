import { useForm } from "@tanstack/react-form";
import { cn } from "cn";
import { ArchiveIcon, ArchiveRestoreIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { BoardRefreshButton, BoardRefreshFeedback } from "@/features/refresh/board-refresh";

import { boardErrorMessage, boardFieldErrors } from "./api";
import { useUpdateBoard } from "./queries";
import { boardCreateSchema, type Board } from "./schemas";

const renameBoardSchema = boardCreateSchema.pick({ displayName: true });
const boardTitleClassName =
  "text-lg leading-normal font-semibold whitespace-pre-wrap wrap-anywhere";

export function BoardRow({
  board,
  onStatus,
}: {
  board: Board;
  onStatus: (message: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const renameButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const update = useUpdateBoard();
  const input = useRef<HTMLTextAreaElement>(null);
  const archived = board.archivedAt !== null;
  const editing = renaming && !archived;
  const formId = `rename-board-${board.id}`;
  const errors = boardFieldErrors(update.error);

  useEffect(() => {
    // Board data can arrive after the router's initial fragment navigation.
    const id = `board-${board.id}`;
    if (window.location.hash === `#${id}`) document.getElementById(id)?.focus();
  }, [board.id]);

  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else if (returnFocus.current) {
      renameButton.current?.focus();
      returnFocus.current = false;
    }
  }, [editing]);

  const form = useForm({
    defaultValues: { displayName: board.displayName },
    validators: { onSubmit: renameBoardSchema },
    onSubmitInvalid: () => input.current?.focus(),
    onSubmit: async ({ value }) => {
      try {
        const saved = await update.mutateAsync({
          id: board.id,
          input: renameBoardSchema.parse(value),
        });
        onStatus(`${saved.displayName} renamed.`);
        finishRename();
      } catch {
        // Keep the proposed name editable while the confirmed board remains unchanged.
      }
    },
  });

  function finishRename() {
    update.reset();
    returnFocus.current = true;
    setRenaming(false);
  }

  async function changeArchiveState() {
    try {
      const saved = await update.mutateAsync({ id: board.id, input: { archived: !archived } });
      onStatus(`${saved.displayName} ${saved.archivedAt === null ? "restored" : "archived"}.`);
      document.getElementById(archived ? "archived-boards-tab" : "active-boards-tab")?.focus();
    } catch {
      // Only a confirmed response moves this board between views.
    }
  }

  return (
    <article
      id={`board-${board.id}`}
      tabIndex={-1}
      aria-labelledby={`board-name-${board.id}`}
      className={cn(
        "relative isolate flex min-h-40 min-w-0 flex-col justify-between gap-4 rounded-xl border p-5 outline-ring focus-visible:outline-2 focus-visible:outline-offset-4 sm:p-6",
        !editing &&
          "cursor-pointer transition-colors hover:bg-muted/50 focus-within:bg-muted/50 motion-reduce:transition-none",
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              id={`board-name-${board.id}`}
              className={cn(boardTitleClassName, editing && "sr-only")}
            >
              {editing ? (
                board.displayName
              ) : (
                <Link
                  href={`/boards/${board.id}`}
                  prefetch={false}
                  className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
                >
                  {board.displayName}
                </Link>
              )}
            </h3>
            {editing ? (
              <form
                id={formId}
                aria-label={`Rename ${board.displayName}`}
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!update.isPending) void form.handleSubmit();
                }}
              >
                <FieldGroup>
                  <form.Field name="displayName">
                    {(field) => {
                      const invalid =
                        !field.state.meta.isValid || Boolean(errors?.displayName?.length);
                      return (
                        <Field data-invalid={invalid} data-disabled={update.isPending}>
                          <FieldLabel htmlFor={`rename-${board.id}`} className="sr-only">
                            Company name for {board.displayName}
                          </FieldLabel>
                          <div className="grid min-w-0">
                            {/* The mirror keeps wrapped titles the same height in every browser. */}
                            <span
                              aria-hidden="true"
                              className={cn(
                                boardTitleClassName,
                                "invisible col-start-1 row-start-1",
                              )}
                            >
                              {field.state.value || "\u00a0"}
                            </span>
                            <Textarea
                              id={`rename-${board.id}`}
                              name={field.name}
                              ref={input}
                              rows={1}
                              autoComplete="organization"
                              maxLength={120}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(event) => {
                                update.reset();
                                field.handleChange(event.target.value.replace(/[\r\n]+/g, " "));
                              }}
                              onKeyDown={(event) => {
                                if (event.nativeEvent.isComposing || update.isPending) return;
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  finishRename();
                                } else if (event.key === "Enter") {
                                  event.preventDefault();
                                  void form.handleSubmit();
                                }
                              }}
                              disabled={update.isPending}
                              aria-invalid={invalid}
                              aria-describedby={invalid ? `rename-errors-${board.id}` : undefined}
                              className={cn(
                                boardTitleClassName,
                                "col-start-1 row-start-1 h-full min-h-0 resize-none overflow-hidden rounded-sm border-0 bg-transparent p-0 shadow-none md:text-lg dark:bg-transparent",
                              )}
                            />
                          </div>
                          <FieldError
                            id={`rename-errors-${board.id}`}
                            errors={field.state.meta.errors}
                          >
                            {errors?.displayName?.join(" ")}
                          </FieldError>
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>
              </form>
            ) : null}
          </div>
          <Badge variant="outline" className="mt-1">
            {board.provider === "ashby"
              ? "Ashby"
              : board.sourceHost === "jobs.eu.lever.co"
                ? "Lever · EU"
                : "Lever"}
          </Badge>
        </div>
        <a
          href={board.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 w-fit max-w-full rounded-sm text-sm text-primary underline underline-offset-4 outline-ring focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span className="wrap-anywhere">{board.canonicalUrl}</span>{" "}
          <ExternalLinkIcon aria-hidden="true" className="inline size-3.5" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      {!archived ? (
        <BoardRefreshFeedback id={board.id} lastSuccess={board.lastSuccessfulRefreshAt} />
      ) : null}
      {/* Keep Rename's click from becoming a submit when the footer switches modes. */}
      <div
        key={editing ? "rename-actions" : "board-actions"}
        className="flex flex-wrap items-start gap-3"
      >
        {editing ? (
          <div className="relative z-10 ms-auto flex flex-wrap gap-2">
            <Button type="submit" form={formId} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save name"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={update.isPending}
              onClick={finishRename}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            {!archived ? (
              <BoardRefreshButton
                id={board.id}
                name={board.displayName}
                disabled={update.isPending}
              />
            ) : null}
            <div className="relative z-10 ms-auto flex flex-wrap gap-2">
              {!archived ? (
                <Button
                  ref={renameButton}
                  type="button"
                  variant="outline"
                  disabled={update.isPending}
                  aria-label={`Rename ${board.displayName}`}
                  onClick={() => {
                    update.reset();
                    form.reset({ displayName: board.displayName });
                    setRenaming(true);
                  }}
                >
                  <PencilIcon aria-hidden="true" data-icon="inline-start" />
                  Rename
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={update.isPending}
                aria-label={`${archived ? "Restore" : "Archive"} ${board.displayName}`}
                onClick={() => void changeArchiveState()}
              >
                {archived ? (
                  <ArchiveRestoreIcon aria-hidden="true" data-icon="inline-start" />
                ) : (
                  <ArchiveIcon aria-hidden="true" data-icon="inline-start" />
                )}
                {update.isPending
                  ? archived
                    ? "Restoring…"
                    : "Archiving…"
                  : archived
                    ? "Restore"
                    : "Archive"}
              </Button>
            </div>
          </>
        )}
      </div>
      {update.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{boardErrorMessage(update.error)}</AlertDescription>
        </Alert>
      ) : null}
    </article>
  );
}
