"use client";

import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";

/** The ⋯ menu for secondary actions — keeps page headers to one clear primary. */
export function OverflowMenu({
  items,
  label = "More actions",
}: {
  items: Array<{ label: string; icon?: React.ReactNode; danger?: boolean; onSelect: () => void }>;
  label?: string;
}) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="rounded-btn border border-hairline bg-surface p-2 text-ink-muted shadow-soft transition-colors hover:bg-surface-subtle hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <EllipsisHorizontalIcon className="h-5 w-5" />
        </button>
      </RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          align="end"
          sideOffset={6}
          className="menu-content z-40 min-w-44 rounded-badge border border-hairline bg-surface p-1 shadow-raised"
        >
          {items.map((item) => (
            <RadixDropdown.Item
              key={item.label}
              onSelect={item.onSelect}
              className={`flex cursor-pointer items-center gap-2 rounded-chip px-2.5 py-1.5 text-sm font-medium outline-none data-[highlighted]:bg-surface-subtle ${
                item.danger ? "text-danger-ink" : "text-ink-secondary"
              }`}
            >
              {item.icon}
              {item.label}
            </RadixDropdown.Item>
          ))}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}
