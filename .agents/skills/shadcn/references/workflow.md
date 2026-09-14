# Project-aware workflow

1. Read `components.json` and run `./node_modules/.bin/shadcn info --json` before making shadcn UI changes.
2. Inspect the reported aliases, installed components, resolved paths, Tailwind version, style, base, icon library, and preset.
3. Inspect the existing component source before importing or changing it.
4. Run `./node_modules/.bin/shadcn docs <component...>` before creating, fixing, or composing components. Follow the returned documentation and examples when available.
5. Prefer installed components. Before adding something new, use `search`, `view`, or `add --dry-run` to inspect it.
6. After `add`, read every added file, repair aliases or imports, and verify the component against the project base and bundled rules.
7. Run focused tests, lint, and the mode-appropriate build after edits.

If live documentation cannot be fetched, use the installed component source and these bundled references. Do not guess an API from memory.
