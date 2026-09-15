import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  auditLandingHttp,
  verifyLanding,
  withProductionServer,
} from "../scripts/verify-landing.mjs";

const exec = promisify(execFile);
const project = fileURLToPath(new URL("../", import.meta.url));
const exporter = path.join(
  project,
  ".agents/skills/brand-assets/scripts/export-brand-assets.mjs",
);
const testSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="#21344a" d="M256 224h512v448L512 800 256 672V224Z"/></svg>';

async function temporaryProject() {
  const root = await mkdtemp(path.join(tmpdir(), "local-landing-test-"));
  await mkdir(path.join(root, "app"));
  await mkdir(path.join(root, "public/brand-assets"), { recursive: true });
  await writeFile(path.join(root, "package.json"), '{"private":true}');
  return root;
}

async function serve(handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  };
}

test("brand export produces a consistent pack and rejects stale or missing derivatives", async () => {
  const root = await temporaryProject();
  const run = (...args) =>
    exec(process.execPath, [exporter, "--root", root, ...args], {
      cwd: project,
    });
  try {
    await assert.rejects(verifyLanding(root), /starter is intentionally blank/);
    await writeFile(path.join(root, "public/brand-assets/logo.svg"), testSvg);
    const output = JSON.parse(
      (await run("--apple-background", "#F2EFE8")).stdout,
    );
    assert.equal(output.outputs.length, 8);
    assert.equal(output.changedPaths.length, 8);
    const before = await Promise.all(
      output.outputs.map((file) => readFile(path.join(root, file))),
    );
    assert.equal(JSON.parse((await run("--check")).stdout).unchanged, true);
    assert.deepEqual(
      await Promise.all(
        output.outputs.map((file) => readFile(path.join(root, file))),
      ),
      before,
    );
    await writeFile(path.join(root, "app/icon.svg"), "stale");
    await assert.rejects(run("--check"), /stale, malformed, or does not match/);
    await run("--apple-background", "#F2EFE8");
    await rm(path.join(root, "app/apple-icon.png"));
    await assert.rejects(
      run("--check"),
      /app\/apple-icon.png must be a regular file/,
    );
    await writeFile(
      path.join(root, "public/brand-assets/logo.svg"),
      testSvg.replace("1024 1024", "100 100"),
    );
    await assert.rejects(run("--apple-background", "#F2EFE8"), /viewBox/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("HTTP audit checks metadata, same-origin assets, status, type, and exact bytes", async (t) => {
  const root = await temporaryProject();
  const icons = new Map([
    ["/favicon.ico", Buffer.from("ico-bytes")],
    ["/icon.svg", Buffer.from(testSvg)],
    ["/apple-icon.png", Buffer.from("png-bytes")],
  ]);
  let mode = "valid";
  let iconRequests = 0;
  const server = await serve((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname === "/") {
      if (mode === "page-500") {
        response.writeHead(500);
        response.end("failed");
        return;
      }
      response.setHeader(
        "content-type",
        mode === "page-type" ? "application/json" : "text/html",
      );
      const links = [...icons.keys()]
        .filter((key) => mode !== "missing" || key !== "/icon.svg")
        .map((key) => {
          const rel =
            key === "/apple-icon.png" && mode !== "relation"
              ? "apple-touch-icon"
              : "icon";
          const href =
            mode === "external"
              ? `https://example.invalid${key}`
              : `${key}?hash=123&amp;v=1`;
          return `<link rel="${rel}" href="${href}">`;
        })
        .join("");
      response.end(
        `<html><head>${links}${mode === "extra" ? '<link rel="icon" href="/old.ico">' : ""}</head><body>Fixture</body></html>`,
      );
    } else {
      iconRequests += 1;
      if (mode === "redirect") {
        response.writeHead(302, { location: "https://example.invalid/icon" });
        response.end();
        return;
      }
      if (mode === "hanging") return;
      response.setHeader(
        "content-type",
        mode === "icon-type" ? "text/html" : "image/png",
      );
      response.end(mode === "bytes" ? "wrong" : icons.get(pathname));
    }
  });
  try {
    for (const [name, bytes] of icons)
      await writeFile(path.join(root, "app", name.slice(1)), bytes);
    await t.test("accepts correct local metadata and bytes", async () => {
      assert.equal(
        (await auditLandingHttp(root, server.origin)).icons.length,
        3,
      );
    });
    for (const failure of [
      "missing",
      "extra",
      "relation",
      "external",
      "redirect",
      "bytes",
      "icon-type",
      "page-type",
      "page-500",
      "hanging",
    ]) {
      await t.test(`rejects ${failure}`, async () => {
        mode = failure;
        iconRequests = 0;
        await assert.rejects(
          auditLandingHttp(
            root,
            server.origin,
            failure === "hanging" ? 100 : 2000,
          ),
        );
        if (failure === "external") assert.equal(iconRequests, 0);
      });
    }
  } finally {
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("production supervisor cleans up its own process on success and failures", async (t) => {
  const root = await temporaryProject();
  const sentinel = await serve((_request, response) =>
    response.end("unrelated preview"),
  );
  try {
    for (const scenario of [
      "success",
      "readiness-timeout",
      "early-exit",
      "http-failure",
    ]) {
      await t.test(scenario, async () => {
        const pidFile = path.join(root, `${scenario}.pid`);
        const start = `require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));`;
        const body =
          scenario === "early-exit"
            ? "process.exit(7);"
            : scenario === "readiness-timeout"
              ? "setInterval(() => {}, 1000);"
              : `require('node:http').createServer((req,res)=>{res.statusCode=${scenario === "http-failure" ? 503 : 200};res.end('ok');}).listen(+process.env.PORT,'127.0.0.1',()=>console.log('Ready in 1ms'));`;
        let usedOrigin;
        const invocation = withProductionServer(
          root,
          async (origin) => {
            usedOrigin = origin;
            const response = await fetch(origin, {
              signal: AbortSignal.timeout(2000),
            });
            await response.text();
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return "checked";
          },
          {
            args: ["-e", start + body],
            startupTimeoutMs: scenario === "readiness-timeout" ? 500 : 3000,
          },
        );
        if (scenario === "success") assert.equal(await invocation, "checked");
        else
          await assert.rejects(
            invocation,
            scenario === "readiness-timeout"
              ? /timed out/
              : scenario === "early-exit"
                ? /before readiness/
                : /HTTP 503/,
          );
        const pid = Number(await readFile(pidFile, "utf8"));
        assert.throws(
          () => process.kill(pid, 0),
          (error) => error.code === "ESRCH",
        );
        if (usedOrigin)
          await assert.rejects(
            fetch(usedOrigin, { signal: AbortSignal.timeout(500) }),
          );
        assert.equal(
          await (await fetch(sentinel.origin)).text(),
          "unrelated preview",
        );
      });
    }
    await t.test("a missing executable fails clearly", async () => {
      await assert.rejects(
        withProductionServer(root, () => assert.fail("must not inspect"), {
          command: path.join(root, "missing-executable"),
          args: [],
          startupTimeoutMs: 2000,
        }),
        /ENOENT/,
      );
    });
  } finally {
    await sentinel.close();
    await rm(root, { recursive: true, force: true });
  }
});
