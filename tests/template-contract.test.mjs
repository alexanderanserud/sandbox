import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import {
  getMotionRevealDelaySeconds,
  MAX_MOTION_REVEAL_DELAY_MS,
  normalizeMotionRevealDelayMs,
} from "../lib/motion-reveal-timing.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const exists = (path) => access(new URL(path, root));
const visibleStaticFallbackPattern =
  /if \(!shouldAnimate \|\| prefersReducedMotion\) \{[\s\S]*?return\s*(?:\(\s*)?<div/;

test("the repository exposes the host-required Next.js source contract", async () => {
  await Promise.all(
    [
      "app/layout.tsx",
      "app/page.tsx",
      "app/globals.css",
      "package.json",
      "package-lock.json",
      "components.json",
      ".env.example",
      ".polycorp/plan.md",
      ".polycorp/template.json",
      "components/motion-reveal.tsx",
      "components/polycorp-preview-bridge.tsx",
      "lib/motion-reveal-timing.ts",
    ].map(exists),
  );

  const packageJson = JSON.parse(await read("package.json"));
  const templateCi = await read(".github/workflows/template-ci.yml");
  for (const script of [
    "start",
    "build",
    "lint",
    "typecheck",
    "test:contract",
  ]) {
    assert.equal(typeof packageJson.scripts?.[script], "string", script);
  }
  assert.equal(packageJson.packageManager, "npm@11.11.0");
  assert.deepEqual(packageJson.engines, { node: "24.x", npm: "11.11.0" });
  assert.equal(
    packageJson.scripts?.["release:check"],
    "npm run format:check && npm run verify",
  );
  assert.match(templateCi, /npm run release:check/);
  assert.match(
    templateCi,
    /github\.repository == 'polycorp-ai\/polycorp-shadcn-nextjs'/,
  );
});

test("shadcn is already initialized with the neutral named Nova contract", async () => {
  const components = JSON.parse(await read("components.json"));
  assert.equal(components.style, "radix-nova");
  assert.equal(components.rsc, true);
  assert.equal(components.tailwind?.css, "app/globals.css");
  assert.equal(components.iconLibrary, "lucide");
  assert.deepEqual(components.aliases, {
    components: "@/components",
    utils: "@/lib/utils",
    ui: "@/components/ui",
    lib: "@/lib",
    hooks: "@/hooks",
  });
});

test("the immutable Polycorp marker, plan, and preview bridge are connected", async () => {
  const marker = JSON.parse(await read(".polycorp/template.json"));
  const plan = await read(".polycorp/plan.md");
  const layout = await read("app/layout.tsx");
  const bridge = await read("components/polycorp-preview-bridge.tsx");

  assert.deepEqual(marker, {
    schemaVersion: 1,
    templateVersion: "1.4.2",
    framework: "nextjs-app-router",
    packageManager: "npm",
    shadcnStyle: "radix-nova",
  });
  const packageJson = JSON.parse(await read("package.json"));
  const lockfile = JSON.parse(await read("package-lock.json"));
  assert.equal(packageJson.version, marker.templateVersion);
  assert.equal(lockfile.version, packageJson.version);
  assert.equal(lockfile.packages[""].version, packageJson.version);
  assert.match(plan, /POLYCORP_SHADCN_BOOTSTRAP_V1/);
  assert.match(layout, /<PolycorpPreviewBridge \/>/);
  assert.doesNotMatch(layout, /PolycorpBadge/);
  await assert.rejects(exists("components/polycorp-badge.tsx"));
  assert.match(bridge, /polycorp:website-preview-ready/);
  assert.match(bridge, /__polycorp_preview/);
  assert.match(bridge, /__polycorp_preview_reload/);
  assert.match(bridge, /data-polycorp-preview-bridge="1"/);
  assert.match(bridge, /document\.fonts\.ready/);
});

test("Motion is pinned with a hydration-safe landing-page reveal contract", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const lockfile = JSON.parse(await read("package-lock.json"));
  const motionReveal = await read("components/motion-reveal.tsx");
  const instructions = await read("AGENTS.md");

  assert.equal(packageJson.dependencies.motion, "12.43.0");
  assert.equal(lockfile.packages[""].dependencies.motion, "12.43.0");
  assert.equal(lockfile.packages["node_modules/motion"].version, "12.43.0");
  assert.match(motionReveal, /^"use client";/);
  assert.match(motionReveal, /from "motion\/react"/);
  assert.match(motionReveal, /LazyMotion/);
  assert.match(motionReveal, /useReducedMotion/);
  assert.match(motionReveal, /delayMs\?: number/);
  assert.doesNotMatch(motionReveal, /\bdelay\?: number/);
  assert.match(
    motionReveal,
    /NonNullable<HTMLMotionProps<"div">\["transition"\]>,\s*"delay"/,
  );
  assert.match(
    motionReveal,
    /\.\.\.transition,\s*delay: getMotionRevealDelaySeconds\(delayMs\)/,
  );
  assert.match(
    motionReveal,
    /whileInView=\{\{ opacity: 1, y: 0, scale: 1 \}\}/,
  );
  assert.match(motionReveal, /if \(!shouldAnimate \|\| prefersReducedMotion\)/);
  assert.match(motionReveal, visibleStaticFallbackPattern);
  assert.doesNotMatch(
    "if (!shouldAnimate || prefersReducedMotion) { return null; }",
    visibleStaticFallbackPattern,
  );
  assert.match(instructions, /must import `MotionReveal`/);
  assert.match(instructions, /delayMs=\{Math\.min\(index \* 70, 240\)\}/);
  assert.match(instructions, /raw transition delay uses seconds/);
  assert.match(instructions, /visible before hydration/);
});

test("MotionReveal normalizes milliseconds before handing delay to Motion", () => {
  assert.equal(MAX_MOTION_REVEAL_DELAY_MS, 240);
  assert.equal(normalizeMotionRevealDelayMs(0), 0);
  assert.equal(normalizeMotionRevealDelayMs(70), 70);
  assert.equal(normalizeMotionRevealDelayMs(240), 240);
  assert.equal(normalizeMotionRevealDelayMs(-1), 0);
  assert.equal(normalizeMotionRevealDelayMs(70_000), 240);
  assert.equal(normalizeMotionRevealDelayMs(Number.NaN), 0);
  assert.equal(normalizeMotionRevealDelayMs(Number.POSITIVE_INFINITY), 0);
  assert.equal(getMotionRevealDelaySeconds(70), 0.07);
  assert.equal(getMotionRevealDelaySeconds(70_000), 0.24);
});

test("core integration manifests match the host-owned CLI surface", async () => {
  const expected = {
    git: ["gitCli", "native_cli"],
    github: ["githubCli", "api_adapter"],
    vercel: ["vercelCli", "api_adapter"],
  };

  for (const [provider, [toolName, mode]] of Object.entries(expected)) {
    const manifest = JSON.parse(
      await read(`polycorp-integrations/${provider}.json`),
    );
    assert.deepEqual(Object.keys(manifest).sort(), [
      "accessTier",
      "adapter",
      "configFiles",
      "environmentVariables",
      "implementationFiles",
      "migrationFiles",
      "packageResolutionId",
      "packages",
      "provider",
      "schemaVersion",
      "skill",
      "skillProvenance",
      "toolName",
    ]);
    assert.equal(manifest.schemaVersion, 3);
    assert.equal(manifest.provider, provider);
    assert.equal(manifest.toolName, toolName);
    assert.equal(manifest.accessTier, "core");
    assert.equal(manifest.adapter.mode, mode);
    assert.equal(manifest.packageResolutionId, null);
    assert.deepEqual(manifest.skillProvenance, []);
    assert.deepEqual(manifest.packages, []);
    assert.deepEqual(manifest.implementationFiles, []);
    assert.deepEqual(manifest.configFiles, []);
    assert.deepEqual(manifest.migrationFiles, []);
    assert.deepEqual(manifest.environmentVariables, []);
  }
});

test("the starter has no alternate framework or hosting configuration", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  assert.equal(dependencies.next, "16.3.4");
  assert.equal(dependencies.shadcn, "4.20.1");
  assert.equal("vite" in dependencies, false);
  assert.equal("@tanstack/react-start" in dependencies, false);
  await assert.rejects(exists("vite.config.ts"));
  await assert.rejects(exists("vercel.json"));
});

test("build-time fonts and customer secrets are not baked into the template", async () => {
  const layout = await read("app/layout.tsx");
  const environmentExample = await read(".env.example");
  const rootPackageLock = JSON.parse(await read("package-lock.json")).packages[
    ""
  ];

  assert.doesNotMatch(layout, /next\/font\/google/);
  assert.equal(
    environmentExample.trim(),
    "# Browser-safe values synchronized by Polycorp for Preview and Production belong here.",
  );
  assert.doesNotMatch(environmentExample, /NEXT_PUBLIC_POLYCORP_BADGE/);
  assert.equal(rootPackageLock.dependencies["next-themes"], undefined);
  await exists("public/images/generated/.gitkeep");
});
