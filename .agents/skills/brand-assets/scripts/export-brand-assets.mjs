#!/usr/bin/env node
import { createRequire } from "node:module";
import {
  lstat,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const SOURCE_SIZE = 1024;
const SAFE_MARGIN = 96;
const MAX_SVG_BYTES = 64 * 1024;
const ICO_SIZES = [16, 32, 48, 256];
const PUBLIC_FILES = {
  logo: "public/brand-assets/logo.png",
  favicon16: "public/brand-assets/favicon-16x16.png",
  favicon32: "public/brand-assets/favicon-32x32.png",
  favicon: "public/brand-assets/favicon.ico",
  apple: "public/brand-assets/apple-touch-icon.png",
};
const APP_FILES = {
  icon: "app/icon.svg",
  favicon: "app/favicon.ico",
  apple: "app/apple-icon.png",
};

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const parsed = { root: process.cwd(), appleBackground: "", check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      parsed.root = argv[index + 1] || "";
      index += 1;
    } else if (argument === "--apple-background") {
      parsed.appleBackground = argv[index + 1] || "";
      index += 1;
    } else if (argument === "--check") {
      parsed.check = true;
    } else if (argument === "--help" || argument === "-h") {
      process.stdout.write(
        "Usage: export-brand-assets.mjs --root <project-root> --apple-background <#RRGGBB>\n",
      );
      process.exit(0);
    } else {
      fail("Unknown argument: " + argument);
    }
  }
  if (!parsed.root) fail("--root is required.");
  if (
    !(parsed.check && !parsed.appleBackground) &&
    !/^#[0-9a-f]{6}$/i.test(parsed.appleBackground)
  ) {
    fail("--apple-background must be a six-digit hex color such as #0F172A.");
  }
  return parsed;
}

async function assertRegularFile(filePath, label) {
  const stats = await lstat(filePath).catch(() => null);
  if (!stats || !stats.isFile() || stats.isSymbolicLink()) {
    fail(label + " must be a regular file.");
  }
}

function validateSvg(source, byteLength) {
  if (byteLength === 0) fail("logo.svg is empty.");
  if (byteLength > MAX_SVG_BYTES) {
    fail("logo.svg exceeds the 64 KiB brand asset limit.");
  }
  if (/<!doctype|<!entity|<\?xml-stylesheet/i.test(source)) {
    fail("logo.svg may not contain document types, entities, or stylesheets.");
  }
  if (/\s(?:on[a-z]+|href|xlink:href|style)\s*=/i.test(source)) {
    fail("logo.svg contains an unsafe event, link, or style attribute.");
  }
  if (/javascript\s*:|data\s*:/i.test(source)) {
    fail("logo.svg may not contain executable or embedded data URLs.");
  }

  const openingTag = source.match(/<svg\b[^>]*>/i)?.[0];
  if (!openingTag || !/<\/svg\s*>/i.test(source)) {
    fail("logo.svg must contain one complete svg root element.");
  }
  if ((source.match(/<svg\b/gi) || []).length !== 1) {
    fail("logo.svg must contain exactly one svg root element.");
  }
  const viewBox = openingTag.match(/\bviewBox\s*=\s*(['"])([^'"]+)\1/i)?.[2];
  const values = viewBox
    ? viewBox
        .trim()
        .split(/[\s,]+/)
        .map((value) => Number(value))
    : [];
  if (
    values.length !== 4 ||
    values.some((value) => !Number.isFinite(value)) ||
    values[0] !== 0 ||
    values[1] !== 0 ||
    values[2] !== SOURCE_SIZE ||
    values[3] !== SOURCE_SIZE
  ) {
    fail('logo.svg must use viewBox="0 0 1024 1024".');
  }

  const allowedTags = new Set([
    "svg",
    "g",
    "path",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "title",
    "desc",
    "defs",
    "lineargradient",
    "radialgradient",
    "stop",
    "clippath",
    "mask",
  ]);
  for (const match of source.matchAll(/<\s*\/?\s*([A-Za-z][\w:-]*)/g)) {
    const tag = match[1].toLowerCase();
    if (!allowedTags.has(tag)) {
      fail("logo.svg contains the unsupported <" + tag + "> element.");
    }
  }
  for (const match of source.matchAll(/url\(([^)]+)\)/gi)) {
    const reference = match[1].trim().replace(/^['"]|['"]$/g, "");
    if (!/^#[A-Za-z_][\w:.-]*$/.test(reference)) {
      fail("logo.svg may reference only local gradient, clip, or mask ids.");
    }
  }
}

async function loadSharp(root) {
  const bases = [...new Set([root, process.cwd()])];
  for (const base of bases) {
    try {
      const requireFromBase = createRequire(path.join(base, "package.json"));
      const sharpModule = requireFromBase("sharp");
      return sharpModule.default || sharpModule;
    } catch {
      // Try the next project-local resolution base.
    }
  }
  fail(
    "The project-local sharp package is unavailable. Run npm ci and retry; do not install an unpinned converter.",
  );
}

async function assertVisibleSafeArea(sharp, png) {
  const result = await sharp(png).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const { data, info } = result;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha <= 4) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0 || maxY < 0) fail("logo.svg has no visible artwork.");
  if (
    minX < SAFE_MARGIN ||
    minY < SAFE_MARGIN ||
    maxX >= SOURCE_SIZE - SAFE_MARGIN ||
    maxY >= SOURCE_SIZE - SAFE_MARGIN
  ) {
    fail(
      "Visible logo artwork must stay inside the 96px safe margin on its square canvas.",
    );
  }
}

async function renderTransparent(sharp, input, size) {
  return sharp(input, {
    density: 72,
    limitInputPixels: SOURCE_SIZE * SOURCE_SIZE * 4,
  })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
}

function createIco(entries) {
  const headerSize = 6;
  const directorySize = entries.length * 16;
  let dataOffset = headerSize + directorySize;
  const header = Buffer.alloc(headerSize + directorySize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  entries.forEach(({ size, png }, index) => {
    const offset = headerSize + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, offset);
    header.writeUInt8(size === 256 ? 0 : size, offset + 1);
    header.writeUInt8(0, offset + 2);
    header.writeUInt8(0, offset + 3);
    header.writeUInt16LE(1, offset + 4);
    header.writeUInt16LE(32, offset + 6);
    header.writeUInt32LE(png.byteLength, offset + 8);
    header.writeUInt32LE(dataOffset, offset + 12);
    dataOffset += png.byteLength;
  });
  return Buffer.concat([header, ...entries.map((entry) => entry.png)]);
}

async function writeIfChanged(filePath, content) {
  const next = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const current = await readFile(filePath).catch(() => null);
  if (current?.equals(next)) return false;
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = filePath + ".brand-" + process.pid;
  await writeFile(temporaryPath, next);
  try {
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root);
  const packagePath = path.join(root, "package.json");
  const appPath = path.join(root, "app");
  const sourcePath = path.join(root, "public/brand-assets/logo.svg");
  await assertRegularFile(packagePath, "The project package.json");
  const appStats = await lstat(appPath).catch(() => null);
  if (!appStats || !appStats.isDirectory() || appStats.isSymbolicLink()) {
    fail("The project must contain a regular app directory.");
  }
  await assertRegularFile(sourcePath, "public/brand-assets/logo.svg");

  const svg = await readFile(sourcePath);
  const svgText = svg.toString("utf8").replace(/^\uFEFF/, "");
  validateSvg(svgText, svg.byteLength);
  const sharp = await loadSharp(root);
  if (args.check && !args.appleBackground) {
    await assertRegularFile(
      path.join(root, PUBLIC_FILES.apple),
      PUBLIC_FILES.apple,
    );
    const { data } = await sharp(path.join(root, PUBLIC_FILES.apple))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (data[3] !== 255)
      fail("Apple icon must use an opaque brand background.");
    args.appleBackground =
      "#" + Buffer.from(data.subarray(0, 3)).toString("hex");
  }

  const logo = await renderTransparent(sharp, svg, SOURCE_SIZE);
  await assertVisibleSafeArea(sharp, logo);
  const iconEntries = await Promise.all(
    ICO_SIZES.map(async (size) => ({
      size,
      png: await renderTransparent(sharp, logo, size),
    })),
  );
  const favicon16 = iconEntries.find((entry) => entry.size === 16).png;
  const favicon32 = iconEntries.find((entry) => entry.size === 32).png;
  const favicon = createIco(iconEntries);
  const appleMark = await renderTransparent(sharp, logo, 132);
  const apple = await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: args.appleBackground,
    },
  })
    .composite([{ input: appleMark, gravity: "center" }])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();

  const outputs = [
    [PUBLIC_FILES.logo, logo],
    [PUBLIC_FILES.favicon16, favicon16],
    [PUBLIC_FILES.favicon32, favicon32],
    [PUBLIC_FILES.favicon, favicon],
    [PUBLIC_FILES.apple, apple],
    [APP_FILES.icon, svg],
    [APP_FILES.favicon, favicon],
    [APP_FILES.apple, apple],
  ];
  const changedPaths = [];
  for (const [relativePath, content] of outputs) {
    if (args.check) {
      await assertRegularFile(path.join(root, relativePath), relativePath);
      if (!(await readFile(path.join(root, relativePath))).equals(content)) {
        fail(
          relativePath +
            " is stale, malformed, or does not match the source mark. Rerun the brand exporter.",
        );
      }
    } else if (await writeIfChanged(path.join(root, relativePath), content)) {
      changedPaths.push(relativePath);
    }
  }
  process.stdout.write(
    JSON.stringify({
      sourcePath: "public/brand-assets/logo.svg",
      changedPaths,
      unchanged: changedPaths.length === 0,
      outputs: outputs.map(([relativePath]) => relativePath),
    }) + "\n",
  );
}

main().catch((error) => {
  process.stderr.write(
    "Brand asset export failed: " +
      (error instanceof Error ? error.message : String(error)) +
      "\n",
  );
  process.exitCode = 1;
});
