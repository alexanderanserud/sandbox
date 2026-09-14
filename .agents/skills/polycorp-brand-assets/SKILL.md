---
name: polycorp-brand-assets
description: "Create or preserve the company SVG logomark and export its complete favicon/icon pack for the first landing-page build or an explicit brand change in this project."
---

# Polycorp Brand Assets

Create one original, durable company logomark and a complete Next.js icon pack. Treat the mark as the company's official visual identity: it may represent the business across the website, browser and application icons, social profiles, and future brand touchpoints. It is not decorative website artwork, a UI or feature icon, or a placeholder. Never copy a recognizable third-party logo or trace any reference pixel-for-pixel.

## When To Run

- On a first landing-page build, inspect the company context, selected landing-page reference, and repository before creating the mark.
- If `public/brand-assets/logo.svg` already contains an established mark, preserve it. Re-export missing derivatives from that SVG without redesigning it.
- Replace the established SVG only when the user explicitly requests a rebrand or logo change.

Create an original company SVG logomark suited to the company and page. The reference image does not approve its depicted logo: do not reuse or closely imitate that logo or require its motif, silhouette, or visual family. Preserve an established company logo unless the user requests a logo change. Use the same source mark for navigation, footer, and favicon exports.

## Brand Concept Before Drawing

- Extract two or three relevant identity attributes from the company name, mission, positioning, audience, and offering. Do not merely depict a product screen, interface control, or workflow.
- Choose one clear visual concept that expresses those attributes and is specific to the company. Record the attributes, concept, and a one-sentence rationale in `.polycorp/plan.md` before authoring the mark.

## Source Mark Contract

- Author `public/brand-assets/logo.svg` as the single source of truth with the exact `viewBox="0 0 1024 1024"`.
- Create a symbol-only official company logomark. Pair it with the company name as live page text rather than embedding a wordmark or text in the SVG.
- Use the landing page palette and visual character, while keeping the vector geometry original and specific to the company.
- Prefer an abstract, distinctive silhouette over a literal depiction of the product interface. Avoid stock-like constructions such as browser windows, dashboards, bot faces, chat bubbles, generic shields or checkmarks, sparkle marks, and icon-library-style symbols unless the user explicitly requests that direction.
- Use balanced geometry, consistent optical weight, and memorable simplicity. The form, not color alone, must carry the identity.
- Keep the canvas transparent and the visible artwork within a roughly 10% safe margin. Use simple geometry and one to three colors so the mark remains credible in a single flat color, recognizable at 16x16, and clear at normal navigation size on both light and dark backgrounds.
- Use SVG shape attributes rather than CSS. Do not include text, scripts, stylesheets, event handlers, external links, embedded data, raster images, browser chrome, or a full-canvas background.
- Do not use raster image generation for logos or favicons. Author the vector mark directly.

## Identity Quality Gate

- Review the mark as a company signature before exporting it. Do not accept it merely because it is technically valid, matches the page palette, or resembles the product category.
- If the mark could plausibly be mistaken for a button icon, feature icon, illustration, generic SaaS pictogram, or fragment of the page interface, redesign it before export.
- Confirm that the silhouette remains coherent in one color and at both 16x16 favicon size and normal navigation size, with sufficient contrast on the page's light and dark surfaces.

## Export The Pack

After writing the source SVG, run:

```bash
node "./.agents/skills/polycorp-brand-assets/scripts/export-brand-assets.mjs" --root "$PWD" --apple-background "#0F172A"
```

Replace `#0F172A` with a solid brand color that contrasts with the mark. The exporter uses the project-local `sharp` installed by the pinned Next.js template; if it is unavailable, run `npm ci` and retry instead of adding an unpinned converter.

The exporter validates the SVG, preserves transparency, and writes:

- `public/brand-assets/logo.png` at 1024x1024
- `public/brand-assets/favicon-16x16.png`
- `public/brand-assets/favicon-32x32.png`
- `public/brand-assets/favicon.ico` with 16, 32, 48, and 256px frames
- `public/brand-assets/apple-touch-icon.png` at 180x180
- Next.js file-convention copies at `app/icon.svg`, `app/favicon.ico`, and `app/apple-icon.png`

Use the exported `app` files as the favicon integration. Next.js adds their metadata automatically; do not add redundant `metadata.icons` entries.

If the exporter fails, treat its error as corrective guidance: fix the reported SVG canvas, safety, visibility, or dependency issue and rerun the same command. Do not finish the website turn with a failed brand export. A missing `sharp` resolution means `npm ci` must be repaired or rerun; it does not authorize installing a different converter.

## Page Usage And Verification

- Use the same unmodified `/brand-assets/logo.svg` as the primary brand mark in the navigation and footer when those areas exist. Pair it consistently with the live company name, adequate spacing, and sufficient contrast. Do not stretch, crop, outline, shadow, or recolor it ad hoc.
- If the company name is adjacent, use an empty image alt; otherwise use a concise brand-name alt.
- Update `.polycorp/plan.md` with the identity attributes and rationale, source mark, export command, and generated paths.
- Run the exporter before `npm run typecheck`, `npm run lint`, and `npm run build`.
- Confirm every expected file exists and that no older custom icon metadata conflicts with the Next.js file-convention assets.

For a read-only consistency check after export, run from the project root:

```bash
node .agents/skills/polycorp-brand-assets/scripts/export-brand-assets.mjs --root "$PWD" --check
```
