# Pinned CLI contract

Use only the repository-pinned executable: `./node_modules/.bin/shadcn`.

Useful project-aware commands:

- `info --json` — framework, aliases, base, icon library, installed components, paths, and preset.
- `docs <component...>` — official documentation and example locations.
- `search <registry> -q <query>` — registry discovery.
- `view <item>` — inspect an uninstalled registry item.
- `add <item> --dry-run` — preview files before installation.
- `add <item> --diff <file>` — compare upstream source with a local component.

Never run `npx shadcn@latest`, another package manager, `shadcn init`, or an unpinned CLI.
Never run `shadcn apply`, `init --preset`, or another preset mutation command. The pinned repository template already owns the complete Nova baseline.
Never use `--overwrite` unless the user explicitly asks to replace local component source. Inspect the resulting changes before proceeding.
Do not guess a third-party registry. Use the registry named by the user or an already configured registry; otherwise ask before installing from one.
