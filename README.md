# Sandbox

A blank Next.js landing-page starter with local Codex skills for design,
shadcn components, and logo/favicon creation.

## Get started

Use **Node 24.x** and **npm 11.11.0**.

```sh
git clone https://github.com/alexanderanserud/sandbox.git
cd sandbox
npm ci
```

Open the folder in Codex and ask it to build your landing page. Describe the
company, offer, audience, confirmed facts, and desired CTA. Attach a reference
image and existing assets if you have them. Write naturally, or copy
[FIRST-PROMPT.md](FIRST-PROMPT.md).

Codex reads `AGENTS.md`, loads the local skills, records the brief in `PLAN.md`,
and builds the site. The starter needs no service accounts or application API
keys. Supply imagery or use an available image-generation tool if your design
requires custom visual assets.

## Preview and check

```sh
npm run dev             # normally http://localhost:3000
npm test                # starter, brand-export, and HTTP verifier tests
npm run verify          # tests, typecheck, lint, and production build
npm run verify:landing  # completed page, including brand and served icon checks
```

If port 3000 is occupied, run `npm run dev -- --port 3001`.

The page is intentionally blank. `verify:landing` requires a company logo and
exported icons, so run it after the first build. Its HTTP check starts and stops
its own server on a temporary local port. The checks verify code and served
assets; visual fidelity and responsive behavior require separate inspection.

## What's included

- `app/` and `components/`: Next.js App Router, Tailwind 4, Nova/Radix shadcn,
  Lucide icons, and the shared MotionReveal helper.
- `.agents/skills/nextjs-landing-page/`: page workflow and design guidance.
- `.agents/skills/shadcn/`: component guidance and bundled references.
- `.agents/skills/brand-assets/`: SVG identity guidance and the icon exporter.
- `PLAN.md`: the brief, reference outline, decisions, and verification results.

The skills travel with the repository and use project-relative paths. Nothing
is installed into global Codex settings. Builds stay local; hosting can be set
up later when you choose to publish.
