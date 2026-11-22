import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const projectDir = "/glycer";
const scriptDir = "/opt/glycer-runtime/scripts";
process.chdir(projectDir);
// The CLI captures homedir at import time. Keep its mutable config in /glycer,
// and only import the sealed SDK after setting HOME (never from the workspace).
process.env.HOME = projectDir;

const port = parseInt(process.env.PORT || "3000", 10);
const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || `app-${Date.now()}`;
const urlFile = join(projectDir, ".tunnel_url");

let tunnel = null;

// Avoid interactive device login when running headlessly without a tunnel credential.
function hasTunnelToken() {
  if (process.env.TUNNEL_TOKEN) return true;
  const configFile = join(projectDir, ".urmate-tunnel", "config.json");
  if (!existsSync(configFile)) return false;
  try {
    const token = JSON.parse(readFileSync(configFile, "utf8")).token;
    if (typeof token !== "string" || !token) return false;
    process.env.TUNNEL_TOKEN = token;
    return true;
  } catch {
    return false;
  }
}

try {
  rmSync(urlFile, { force: true });
} catch {
  console.error("[tunnel] Could not clear previous preview URL. Startup stopped.");
  process.exit(1);
}

if (hasTunnelToken()) {
  try {
    console.log(`[tunnel] Initializing custom tunnel on port ${port}...`);
    const { startTunnel } = await import("@urmatetech/tunl-sdk");
    tunnel = await startTunnel({
      cwd: projectDir,
      // SDK/agent diagnostics may contain credentials. Do not relay them.
      log: () => {},
      port,
      subdomain: projectId,
      name: `Glycer App ${projectId}`,
    });
    console.log("[tunnel] Custom tunnel started.");
    if (tunnel.publicUrl) {
      process.env.EXPO_PACKAGER_PROXY_URL = tunnel.publicUrl;
      process.env.PUBLIC_URL = tunnel.publicUrl;
      writeFileSync(urlFile, tunnel.publicUrl, "utf8");
    }
  } catch {
    console.warn("[tunnel] Could not start custom tunnel. Using direct preview.");
  }
} else {
  console.log(`[tunnel] No TUNNEL_TOKEN or tunl CLI config found. Running in direct local mode.`);
}

// Start Expo dev server (clean without --tunnel)
const args = [join(scriptDir, "expo-logger.js"), "start", "--port", String(port), ...process.argv.slice(2)];
const child = spawn(process.execPath, args, {
  cwd: projectDir,
  stdio: "inherit",
  env: process.env,
});
child.on("error", () => {
  if (tunnel) {
    try { tunnel.stop(); } catch {}
  }
  console.error("[tunnel] Could not start Expo. Startup stopped.");
  process.exit(1);
});

const cleanup = () => {
  if (tunnel) {
    try {
      tunnel.stop();
    } catch {}
  }
  child.kill();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

child.on("exit", (code) => {
  if (tunnel) {
    try {
      tunnel.stop();
    } catch {}
  }
  process.exit(code || 0);
});

