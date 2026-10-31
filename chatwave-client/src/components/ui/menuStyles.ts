/** Shared styling for Radix dropdown menus. */
export const menuContent =
  "z-50 min-w-48 origin-(--radix-dropdown-menu-content-transform-origin) animate-pop rounded-xl border border-line bg-surface p-1 text-fg shadow-pop outline-none";

export const menuItem =
  "flex cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-subtle";

export const menuItemDanger = "text-danger data-[highlighted]:bg-danger-soft [&_svg]:text-danger";

export const menuSeparator = "-mx-1 my-1 h-px bg-line";

export const menuLabel = "px-2.5 pt-2 pb-1 text-xs font-medium text-fg-subtle";
