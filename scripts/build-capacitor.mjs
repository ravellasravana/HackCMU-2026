#!/usr/bin/env node
// Builds a static export of the Next.js app for the Capacitor Android wrapper.
//
// The app's two /api routes (extract, dinners) are server-only proxies to the
// IFM K2 LLM and aren't compatible with `next export` (no server to run them
// on-device). The client already falls back to the local, deterministic
// receipt normalizer and built-in recipe library when a fetch to those routes
// fails (see src/components/receipt-dialog.tsx and dining-car.tsx), so the
// packaged app keeps full offline functionality; only the optional K2/AI
// features are unavailable until this is pointed at a hosted deployment
// (see capacitor.config.ts `server.url`).
//
// Note: Route Handlers (any HTTP method beyond a static GET) aren't supported
// at all under `output: "export"`, so the two route.ts files have to be gone
// for the build, not just stubbed. We delete only the two leaf subfolders
// (not the api/ directory itself) and recreate them from an in-memory backup
// afterward — on Windows, an editor's workspace file watcher can hold a
// directory handle in a way that makes *renaming* an existing, still-present
// directory intermittently fail with EPERM, but deleting/recreating leaf
// folders is unaffected.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const routeDirs = [
  path.join(root, "src", "app", "api", "extract"),
  path.join(root, "src", "app", "api", "dinners"),
];

const originals = new Map();
for (const dir of routeDirs) {
  const file = path.join(dir, "route.ts");
  if (existsSync(file)) originals.set(dir, readFileSync(file, "utf8"));
}

function restore() {
  for (const [dir, content] of originals) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "route.ts"), content);
  }
}

process.on("exit", restore);
process.on("SIGINT", () => process.exit(1));

for (const dir of originals.keys()) {
  rmSync(dir, { recursive: true, force: true });
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "build"],
  {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, CAPACITOR_BUILD: "true" },
  }
);

if (result.error) {
  console.error("Failed to spawn next build:", result.error);
  process.exitCode = 1;
} else if (result.status !== 0) {
  console.error(`next build exited with status ${result.status} (signal: ${result.signal})`);
  process.exitCode = result.status ?? 1;
} else {
  console.log("Static export written to ./out");
}
