---
name: shadcn
description: "Create, compose, style, or revise UI in this local Nova/Radix website template using its pinned shadcn CLI and bundled references."
---

# shadcn/ui website authoring

Use this skill for every website task that creates, composes, installs, styles, fixes, or reviews shadcn components.

This repository owns its component source, `components.json`, and this local skill. Read `AGENTS.md` and `.polycorp/plan.md` first. Resolve references relative to this skill directory.

Before editing UI, read `references/workflow.md` and run the pinned project inspection command described there. Read each additional reference relevant to the requested component or interaction.

## Non-negotiable boundaries

- Use only `./node_modules/.bin/shadcn`; never download or invoke `shadcn@latest`.
- Treat the template-owned Nova baseline, Radix, Lucide, aliases, and menu behavior as fixed architecture.
- Never initialize, apply, or mutate a preset. The standalone starter already contains the pinned template.
- Prefer existing shadcn component source and semantic tokens over custom primitives and hard-coded brand colors.
- Inspect exact installed APIs and current documentation instead of relying on memory.

## Bundled references

- `references/workflow.md` — required project inspection and authoring workflow.
- `references/cli.md` — allowed pinned commands and preset restrictions.
- `references/styling.md` — semantic styling and token rules.
- `references/composition.md` — accessible component composition.
- `references/forms.md` — fields, inputs, validation, and option controls.
- `references/radix-and-icons.md` — fixed Radix and Lucide APIs.
