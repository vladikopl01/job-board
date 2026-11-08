import { companyNameFromSlug, identifyBoardUrl } from "@job-board/job-boards";
import { useForm, useStore } from "@tanstack/react-form";
import { LoaderCircleIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { z } from "zod";

import { InfoTip } from "@/components/info-tip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { BoardApiError, boardErrorMessage, boardFieldErrors } from "./api";
import { useBoardNameSuggestion, useCreateBoard, useUpdateBoard } from "./queries";
import { boardCreateSchema, boardDisplayNameSchema, type Board } from "./schemas";

const boardFormSchema = boardCreateSchema.extend({
  displayName: z
    .string()
    .trim()
    .pipe(boardDisplayNameSchema.or(z.literal(""))),
});

type ExistingBoard = { id: string; archived: boolean };

export function AddBoardForm({
  onSaved,
  onLocate,
  onPendingChange,
}: {
  onSaved: (board: Board, action: "saved" | "restored") => void;
  onLocate: (board: ExistingBoard) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const create = useCreateBoard();
  const restore = useUpdateBoard();
  const urlInput = useRef<HTMLInputElement>(null);
  const companyInput = useRef<HTMLInputElement>(null);
  const pending = create.isPending || restore.isPending;
  const errors = boardFieldErrors(create.error);
  const duplicate =
    create.error instanceof BoardApiError && create.error.detail.code === "DUPLICATE_BOARD"
      ? create.error.detail.existingBoard
      : null;

  useEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);

  const form = useForm({
    defaultValues: { displayName: "", url: "" },
    validators: { onSubmit: boardFormSchema },
    onSubmitInvalid: ({ formApi }) => {
      const input = formApi.getFieldMeta("url")?.isValid === false ? urlInput : companyInput;
      input.current?.focus();
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        const board = await create.mutateAsync(
          boardCreateSchema.parse({
            ...value,
            displayName: value.displayName.trim() || suggestedName,
          }),
        );
        formApi.reset();
        onSaved(board, "saved");
      } catch {
        // Mutation feedback below retains the entered values for correction or retry.
      }
    },
  });

  const url = useStore(form.store, (state) => state.values.url);
  const identified = identifyBoardUrl(url);
  const canonicalUrl = identified.success ? identified.source.canonicalUrl : "";
  const suggestion = useBoardNameSuggestion({ canonicalUrl, enabled: !pending });
  const suggestedName = identified.success
    ? (suggestion.data?.displayName ?? companyNameFromSlug(identified.source))
    : "";

  async function restoreDuplicate(board: ExistingBoard) {
    try {
      const restored = await restore.mutateAsync({ id: board.id, input: { archived: false } });
      create.reset();
      form.reset();
      onSaved(restored, "restored");
    } catch {
      // Restoration remains an explicit action and can be retried below.
    }
  }

  return (
    <form
      aria-label="Add a company board"
      aria-busy={pending}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending) void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="url">
          {(field) => {
            const invalid = !field.state.meta.isValid || Boolean(errors?.url?.length);
            return (
              <Field data-invalid={invalid} data-disabled={pending}>
                <div className="flex items-center gap-1">
                  <FieldLabel htmlFor="board-url">Board URL</FieldLabel>
                  <InfoTip label="About board URLs">
                    Supports Ashby and Lever, including Lever EU. Use a company board root, such as
                    jobs.ashbyhq.com/ramp. Adding a board saves it locally and starts indexing its
                    jobs. If you’re offline, you can retry indexing later.
                  </InfoTip>
                </div>
                <Input
                  id="board-url"
                  ref={urlInput}
                  name={field.name}
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck={false}
                  maxLength={2048}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    create.reset();
                    field.handleChange(event.target.value);
                  }}
                  disabled={pending}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? "board-url-errors" : undefined}
                />
                <FieldError id="board-url-errors" errors={field.state.meta.errors}>
                  {errors?.url?.join(" ")}
                </FieldError>
              </Field>
            );
          }}
        </form.Field>
        <form.Field name="displayName">
          {(field) => {
            const invalid = !field.state.meta.isValid || Boolean(errors?.displayName?.length);
            return (
              <Field data-invalid={invalid} data-disabled={pending}>
                <div className="flex items-center gap-1">
                  <FieldLabel htmlFor="board-company">Company name (optional)</FieldLabel>
                  <InfoTip label="About company names">
                    Leave blank to use the suggested name, or enter your own. Suggestions use page
                    details when available and the URL when offline. You can save while the lookup
                    is running.
                  </InfoTip>
                  {suggestion.isFetching ? (
                    <LoaderCircleIcon
                      aria-hidden="true"
                      className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
                    />
                  ) : null}
                  <output className="sr-only" aria-live="polite">
                    {suggestion.isFetching ? "Looking up the company name…" : ""}
                  </output>
                </div>
                <Input
                  id="board-company"
                  ref={companyInput}
                  name={field.name}
                  autoComplete="organization"
                  maxLength={120}
                  placeholder={suggestedName}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    create.reset();
                    field.handleChange(event.target.value);
                  }}
                  disabled={pending}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? "board-company-errors" : undefined}
                />
                <FieldError id="board-company-errors" errors={field.state.meta.errors}>
                  {errors?.displayName?.join(" ")}
                </FieldError>
              </Field>
            );
          }}
        </form.Field>
        {create.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{boardErrorMessage(create.error)}</AlertDescription>
            {duplicate ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => onLocate(duplicate)}
                >
                  {duplicate.archived ? "View archived board" : "View existing board"}
                </Button>
                {duplicate.archived ? (
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => void restoreDuplicate(duplicate)}
                  >
                    {restore.isPending ? "Restoring…" : "Restore board"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Alert>
        ) : null}
        {restore.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{boardErrorMessage(restore.error)}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" disabled={pending} className="self-start">
          {create.isPending ? "Saving…" : "Save board"}
        </Button>
      </FieldGroup>
    </form>
  );
}
