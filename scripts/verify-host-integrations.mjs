import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [hostRepository, ...extraArguments] = process.argv.slice(2);
assert.ok(
  hostRepository && extraArguments.length === 0,
  "Usage: npm run verify:host-integrations -- /absolute/path/to/hasso-irl",
);

const { generateIntegrationManifest, validateIntegrationManifest } =
  await import(
    pathToFileURL(
      resolve(hostRepository, "lib/provider-integrations/manifest.ts"),
    ).href
  );

for (const provider of ["git", "github", "vercel"]) {
  const manifest = JSON.parse(
    await readFile(
      new URL(`../polycorp-integrations/${provider}.json`, import.meta.url),
      "utf8",
    ),
  );
  const validation = validateIntegrationManifest(manifest);
  assert.equal(
    validation.valid,
    true,
    `${provider}: ${validation.errors?.join("; ") ?? "invalid manifest"}`,
  );
  assert.deepEqual(
    manifest,
    generateIntegrationManifest({ provider }),
    `${provider}: template must match the host's core manifest`,
  );
  console.log(`${provider}: matches the host integration contract`);
}
