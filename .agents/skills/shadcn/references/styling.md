# Styling and customization

- Use semantic tokens such as `bg-background`, `text-foreground`, `bg-primary`, and `text-muted-foreground`; do not hard-code palette utilities for the site brand.
- Use built-in component variants before overriding component styles.
- Use `className` primarily for layout. Put durable brand tokens and global styling in the existing Tailwind CSS file reported by `shadcn info`.
- Use `gap-*` with flex or grid instead of `space-x-*` and `space-y-*`.
- Use `size-*` when width and height are equal and `truncate` for single-line overflow.
- Use the project `cn()` helper for conditional or merged class names.
- Do not add manual `dark:` palette overrides when semantic tokens already cover light and dark modes.
- Do not add manual z-index classes to Dialog, Sheet, Drawer, AlertDialog, DropdownMenu, Popover, Tooltip, or HoverCard.
- Use `Badge` or semantic destructive/status tokens instead of raw green, amber, or red utilities.
- Preserve the template-owned Nova baseline. A page implementation may compose tokens, but may not replace its theme, fonts, radius, base, style, icons, aliases, or menu behavior.
