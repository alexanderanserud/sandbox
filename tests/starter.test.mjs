import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  getMotionRevealDelaySeconds,
  MAX_MOTION_REVEAL_DELAY_MS,
  normalizeMotionRevealDelayMs,
} from "../lib/motion-reveal-timing.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) => readFile(path.join(root, name), "utf8");

test("package metadata and pinned dependencies agree with the lockfile", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const lock = JSON.parse(await read("package-lock.json"));
  assert.equal(pkg.name, lock.name);
  assert.equal(pkg.name, lock.packages[""].name);
  assert.equal(pkg.version, lock.version);
  assert.equal(pkg.version, lock.packages[""].version);
  for (const kind of ["dependencies", "devDependencies"]) {
    assert.deepEqual(pkg[kind], lock.packages[""][kind]);
    for (const [name, version] of Object.entries(pkg[kind])) {
      assert.equal(
        lock.packages[`node_modules/${name}`].version,
        version,
        name,
      );
    }
  }
});

test("UI configuration resolves to the installed project files", async () => {
  const components = JSON.parse(await read("components.json"));
  const tsconfig = JSON.parse(await read("tsconfig.json"));
  assert.equal(components.rsc, true);
  assert.deepEqual(tsconfig.compilerOptions.paths["@/*"], ["./*"]);
  await access(path.join(root, components.tailwind.css));
  for (const name of ["components", "ui"]) {
    await access(path.join(root, components.aliases[name].replace(/^@\//, "")));
  }
  await access(
    path.join(root, components.aliases.utils.replace(/^@\//, "") + ".ts"),
  );
});

test("local skills expose valid entry points and resolvable references", async () => {
  for (const name of ["nextjs-landing-page", "shadcn", "brand-assets"]) {
    const directory = `.agents/skills/${name}`;
    const content = await read(`${directory}/SKILL.md`);
    const metadata = content.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(metadata, `${name}: frontmatter`);
    assert.match(metadata[1], new RegExp(`^name: ${name}$`, "m"));
    assert.match(metadata[1], /^description: .+/m);
    for (const match of content.matchAll(/`(references\/[^`]+\.md)`/g)) {
      await access(path.join(root, directory, match[1]));
    }
  }
  await access(
    path.join(
      root,
      ".agents/skills/brand-assets/scripts/export-brand-assets.mjs",
    ),
  );
});

test("motion delays stay bounded and convert milliseconds to seconds", () => {
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
