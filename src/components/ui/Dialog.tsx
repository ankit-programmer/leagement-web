"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { XMarkIcon } from "@heroicons/react/24/outline";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
        <RadixDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-dialog border border-hairline bg-surface p-6 shadow-overlay animate-fade-up">
          <div className="flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="text-base font-bold tracking-[-0.01em] text-ink">
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-sm text-ink-muted">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close
              aria-label="Close"
              className="rounded-chip p-1 text-ink-faint hover:bg-surface-subtle hover:text-ink"
            >
              <XMarkIcon className="h-5 w-5" />
            </RadixDialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
