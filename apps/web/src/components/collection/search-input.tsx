"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  resetKey = 0,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  resetKey?: number;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [previous, setPrevious] = useState({ value, resetKey });
  const [composing, setComposing] = useState(false);
  const search = useEffectEvent(onChange);
  // Back/forward and Clear filters replace the draft and cancel its pending search.
  if (previous.value !== value || previous.resetKey !== resetKey) {
    setPrevious({ value, resetKey });
    setDraft(value);
  }
  useEffect(() => {
    if (composing || draft.trim() === value) return;
    const timer = setTimeout(() => search(draft.trim()), 300);
    return () => clearTimeout(timer);
  }, [draft, value, composing, resetKey]);
  return (
    <Field className="w-full min-w-0 sm:w-52 sm:shrink">
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <InputGroup className="border-border">
        <InputGroupInput
          ref={inputRef}
          id={id}
          type="search"
          value={draft}
          maxLength={200}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          className="[&::-webkit-search-cancel-button]:appearance-none"
        />
        <InputGroupAddon>
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={`Clear ${label.toLowerCase()}`}
            aria-hidden={!draft}
            inert={!draft}
            tabIndex={draft ? 0 : -1}
            className={!draft ? "invisible" : undefined}
            onClick={() => {
              inputRef.current?.focus();
              setDraft("");
              onChange("");
            }}
          >
            <XIcon aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
