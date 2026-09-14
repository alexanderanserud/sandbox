# Local Codex landing-page starter

Open this folder as a project in Codex. In a new task, ask it to build your
landing page and paste the company context you would normally give Polycorp.
Attach a reference image and existing assets if you have them. Codex reads
`AGENTS.md`, loads the three local skills, records its plan, and builds here.

The page is intentionally blank until that first prompt. You do not need
`hasso-irl`, a Polycorp account, Vercel Sandbox, or separate model API credentials.
Codex itself must be available and signed in. Supply imagery or use an available
image-generation capability if your design needs original bitmap assets.

## First prompt

Use [FIRST-PROMPT.md](FIRST-PROMPT.md) as a copyable example, or write naturally.
Provide your offer, audience, confirmed facts, CTA, and brand rules. Paste
Mission/NABC context if useful. Attach a reference to follow its structure and
art direction. No special format is required. No business or logo is bundled.

## Run locally

Use Node **24.x** and npm **11.11.0**. Dependencies were installed during setup;
on another laptop or after removing `node_modules`, run `npm ci` first.

```sh
npm run dev
```

This normally serves http://localhost:3000. If busy, use
`npm run dev -- --port 3001`. Inspect it manually if desired; Codex must not use
browser automation unless you ask.

```sh
npm run verify          # blank starter or template checks
npm run test:local      # verifier and brand-export regression tests
npm run verify:landing  # completed page, including brand and served icons
```

`verify:landing` intentionally fails on the blank starter because the company's
logo does not exist yet. After implementation it runs the brand exporter in
read-only `--check` mode, template/type/lint/build checks, and an HTTP audit of
`/` and Next.js icon metadata. It uses a temporary loopback port and stops its own
server afterward. It never deploys or commits.

Codex reviews the reference structure itself. There is no independent AI reviewer.
Automated checks do not establish pixel fidelity, responsive rendering,
accessibility, or visual quality. Fix or report verification errors.

## Included skills

All skills live inside `.agents/skills/` and travel with this project:

- `polycorp-nextjs-vercel-website`: landing-page workflow and design constraints.
- `shadcn`: pinned CLI, component composition, styling, and six reference files.
- `polycorp-brand-assets`: SVG identity and the complete icon exporter.

No global skill installation is needed. The root instructions explicitly load
these files. The exporter uses this project's pinned `sharp`; run its documented
commands from the project root.

The default scope is a static landing page. The inert preview bridge and core
integration manifests remain for contract compatibility; they do not connect
services or trigger publishing. Edits stay in this folder.

## Provenance

Packaged on 2026-09-14 from clean `polycorp-ai/polycorp-shadcn-nextjs`, version
**1.4.2**, commit `52a52980c32df5ab874bad2f493f02c55cb27e70`.

Skills were exported from `hasso-irl` commit
`5fc4cb6ca1e6c2fb9aaec53fc9c94cf8286993db`, using
`lib/projects/website-engineer-polycorp-skills.ts`,
`website-engineer-shadcn-skill.ts`, `website-engineer-brand-assets-skill.ts`, and
shared `website-generation-policy.ts` (policy
`2026-09-13-reference-structure-v1`). Those source files were unmodified at export.

Local adaptations replace host tools, skill paths, preview ownership, and
automatic Git/publication assumptions. The original brand exporter is bundled
unchanged. The local HTTP verifier follows the host's served-icon checks without
model-review or persistence machinery. These are provenance references, not
runtime imports; the package is self-contained.

The inherited `verify:host-integrations` command is only for upstream template
maintenance and explicitly needs a host checkout. It is not part of local setup,
development, or either normal verification command.
