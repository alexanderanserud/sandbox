# Component composition

- Compose existing shadcn components instead of recreating their behavior with styled divs.
- Keep items inside their group: SelectItem in SelectGroup, DropdownMenuItem in DropdownMenuGroup, MenubarItem in MenubarGroup, ContextMenuItem in ContextMenuGroup, and CommandItem in CommandGroup.
- Dialog, Sheet, Drawer, and AlertDialog content must include the corresponding accessible title. Use `sr-only` when the title should not be visible.
- Use complete Card structure when applicable: CardHeader, CardTitle, CardDescription, CardContent, and CardFooter.
- TabsTrigger belongs inside TabsList.
- Avatar with an image must include AvatarFallback.
- Compose Button loading states with Spinner, `data-icon`, and `disabled`; Button has no `isLoading` or `isPending` prop.
- Use Alert for callouts, Empty for empty states, Separator instead of raw `hr`, Skeleton for loading placeholders, and Badge for compact states.
- Choose overlays by intent: Dialog for focused input, AlertDialog for destructive confirmation, Sheet for a side panel, Drawer for a mobile bottom panel, HoverCard for hover information, and Popover for small click-triggered content.
- Read the installed component source and official docs before assuming props or composition.
