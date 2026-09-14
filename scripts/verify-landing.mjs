import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const maxResponseBytes = 2_000_000;

async function readResponse(url, timeoutMs) {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status !== 200) {
    await response.body?.cancel();
    throw new Error(`HTTP ${response.status}: ${new URL(url).pathname}`);
  }
  if (Number(response.headers.get("content-length")) > maxResponseBytes) {
    await response.body?.cancel();
    throw new Error("HTTP response exceeds the 2 MB inspection limit.");
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > maxResponseBytes) {
      throw new Error("HTTP response exceeds the 2 MB inspection limit.");
    }
    chunks.push(chunk);
  }
  return {
    body: Buffer.concat(chunks),
    type: response.headers.get("content-type") ?? "",
  };
}

/** Read-only page/icon audit. Never follows redirects or fetches other origins. */
export async function auditLandingHttp(root, origin, requestTimeoutMs = 5000) {
  const page = await readResponse(`${origin}/`, requestTimeoutMs);
  if (!page.type.includes("text/html")) {
    throw new Error("The landing route did not serve HTML.");
  }
  const expected = new Map([
    ["/favicon.ico", "app/favicon.ico"],
    ["/icon.svg", "app/icon.svg"],
    ["/apple-icon.png", "app/apple-icon.png"],
  ]);
  const seen = new Set();
  const errors = [];
  for (const tag of page.body.toString("utf8").matchAll(/<link\b[^>]*>/gi)) {
    const attributes = Object.fromEntries(
      [...tag[0].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(
        (match) => [match[1].toLowerCase(), match[2] ?? match[3]],
      ),
    );
    const relations = (attributes.rel ?? "").toLowerCase().split(/\s+/);
    if (
      !relations.some(
        (value) => value === "icon" || value.startsWith("apple-touch-icon"),
      )
    )
      continue;
    try {
      const url = new URL(
        (attributes.href ?? "").replaceAll("&amp;", "&"),
        origin,
      );
      const file = expected.get(url.pathname);
      if (url.origin !== origin || !file || url.username || url.password) {
        throw new Error(
          `Conflicting or unsupported icon metadata: ${url.pathname}`,
        );
      }
      if (
        (url.pathname === "/apple-icon.png") !==
        relations.includes("apple-touch-icon")
      ) {
        throw new Error(`Incorrect icon relation: ${url.pathname}`);
      }
      const icon = await readResponse(url, requestTimeoutMs);
      if (
        !/^image\//i.test(icon.type) ||
        !icon.body.equals(await readFile(path.join(root, file)))
      ) {
        throw new Error(
          `Served icon does not match the exported asset: ${url.pathname}`,
        );
      }
      seen.add(url.pathname);
    } catch (error) {
      errors.push(error.message);
    }
  }
  for (const pathname of expected.keys()) {
    if (!seen.has(pathname))
      errors.push(`Missing working icon metadata: ${pathname}`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return { page: "/", icons: [...seen] };
}

async function availablePort() {
  const reservation = createServer();
  await new Promise((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolve);
  });
  const port = reservation.address().port;
  await new Promise((resolve, reject) =>
    reservation.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

function ownProcess(command, args, options) {
  const child = spawn(command, args, options);
  let outcome;
  const closed = new Promise((resolve) => {
    child.once("error", (error) => {
      outcome = { error };
      resolve(outcome);
    });
    child.once("close", (code, signal) => {
      outcome ??= { code, signal };
      resolve(outcome);
    });
  });
  return { child, closed, outcome: () => outcome };
}

async function stopOwnedProcess(processState) {
  if (processState.outcome()) return;
  processState.child.kill("SIGTERM");
  const timeout = new AbortController();
  const ended = await Promise.race([
    processState.closed.then(() => true),
    delay(2000, false, { signal: timeout.signal }).catch(() => true),
  ]);
  timeout.abort();
  if (!ended && !processState.outcome()) {
    processState.child.kill("SIGKILL");
    await processState.closed;
  }
}

/** Start only our own Next process; wait for its readiness log before probing. */
export async function withProductionServer(root, inspect, options = {}) {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const args = options.args ?? [
    path.join(root, "node_modules/next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ];
  const processState = ownProcess(options.command ?? process.execPath, args, {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  processState.child.stdout?.on("data", (chunk) => {
    stdout = (stdout + chunk).slice(-12000);
  });
  processState.child.stderr?.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-12000);
  });
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
    processState.child.kill("SIGTERM");
  };
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  try {
    const deadline = Date.now() + (options.startupTimeoutMs ?? 30000);
    while (!/Ready in\b/.test(stdout)) {
      if (interrupted) throw new Error("Verification interrupted.");
      const outcome = processState.outcome();
      if (outcome)
        throw new Error(
          `Production server exited before readiness: ${outcome.error?.message ?? outcome.code ?? outcome.signal}\n${stderr || stdout}`,
        );
      if (Date.now() >= deadline)
        throw new Error(
          `Production server readiness timed out.\n${stderr || stdout}`,
        );
      await delay(50);
    }
    if (interrupted || processState.outcome())
      throw new Error("Production server stopped during readiness.");
    const result = await inspect(origin);
    if (interrupted || processState.outcome())
      throw new Error("Production server stopped during HTTP verification.");
    return result;
  } finally {
    await stopOwnedProcess(processState);
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
}

async function runCheck(label, command, args, root) {
  console.log(`\n${label}`);
  const processState = ownProcess(command, args, {
    cwd: root,
    stdio: "inherit",
  });
  const outcome = await processState.closed;
  if (outcome.error || outcome.code !== 0) {
    throw new Error(
      `${label} failed: ${outcome.error?.message ?? outcome.code ?? outcome.signal}`,
    );
  }
}

export async function verifyLanding(root = projectRoot) {
  const source = path.join(root, "public/brand-assets/logo.svg");
  if (!(await stat(source).catch(() => null))?.isFile()) {
    throw new Error(
      "No company logo exists yet. This starter is intentionally blank. Build the landing page and run the bundled brand exporter first; use npm run verify to check the blank template.",
    );
  }
  await runCheck(
    "Check brand exports",
    process.execPath,
    [
      path.join(
        root,
        ".agents/skills/polycorp-brand-assets/scripts/export-brand-assets.mjs",
      ),
      "--root",
      root,
      "--check",
    ],
    root,
  );
  await runCheck(
    "Verify template, types, lint, and production build",
    "npm",
    ["run", "verify"],
    root,
  );
  if (!(await readFile(path.join(root, ".next/BUILD_ID"), "utf8")).trim()) {
    throw new Error(
      "Production build did not produce a nonempty .next/BUILD_ID.",
    );
  }
  const result = await withProductionServer(root, (origin) =>
    auditLandingHttp(root, origin),
  );
  console.log(
    `\nLanding verification passed: HTML ${result.page} and ${result.icons.length} matching icons.`,
  );
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  verifyLanding().catch((error) => {
    console.error(`Landing verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
