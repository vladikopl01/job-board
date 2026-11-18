"use client";

import { MailIcon, MailOpenIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { indexErrorMessage } from "./api";

export function ReadStateButton({
  readAt,
  disabled,
  onClick,
  iconOnly = false,
}: {
  readAt: string | null;
  disabled: boolean;
  onClick: () => void;
  iconOnly?: boolean;
}) {
  const Icon = readAt ? MailIcon : MailOpenIcon;
  const label = readAt ? "Mark unread" : "Mark read";
  const button = (
    <Button
      variant="outline"
      size={iconOnly ? "icon" : "default"}
      aria-label={label}
      className="aria-disabled:opacity-50"
      focusableWhenDisabled
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden="true" data-icon={iconOnly ? undefined : "inline-start"} />
      {iconOnly ? null : label}
    </Button>
  );
  return iconOnly ? (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  ) : (
    button
  );
}

export function ReadStateError({
  error,
  disabled,
  onRetry,
}: {
  error: unknown;
  disabled: boolean;
  onRetry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription>Couldn’t save read state. {indexErrorMessage(error)}</AlertDescription>
      <Button variant="outline" disabled={disabled} onClick={onRetry}>
        Retry read change
      </Button>
    </Alert>
  );
}
