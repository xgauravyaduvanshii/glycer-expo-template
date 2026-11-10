import { startTunnel } from "@urmatetech/tunl-sdk";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const port = parseInt(process.env.PORT || "3000", 10);
const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || `app-${Date.now()}`;
const urlFile = join(dirname(fileURLToPath(import.meta.url)), "..", ".tunnel_url");

let tunnel = null;

// The token can arrive from the environment or from the tunl CLI config baked into the
// sandbox image. Probing it here instead of letting startTunnel() resolve it keeps the
// interactive device login (an 8-digit code and an open browser) out of a headless sandbox.
function hasTunnelToken() {
  if (process.env.TUNNEL_TOKEN) return true;
  const configFile = join(homedir(), ".urmate-tunnel", "config.json");
  if (!existsSync(configFile)) return false;
  try {
    return Boolean(JSON.parse(readFileSync(configFile, "utf8")).token);
  } catch {
    return false;
  }
}

if (hasTunnelToken()) {
  try {
    // The backend reads .tunnel_url to learn which URL the edge actually assigned. Clearing it
    // first means it can never publish the previous run's tunnel after this one fails to start.
    rmSync(urlFile, { force: true });
    console.log(`[tunnel] Initializing @urmatetech/tunl-sdk on port ${port} (subdomain: ${projectId})...`);
    tunnel = await startTunnel({
      port,
      subdomain: projectId,
      name: `Glycer App ${projectId}`,
    });
    console.log(`[tunnel] ✅ Custom Tunnel Active: ${tunnel.publicUrl}`);
    if (tunnel.publicUrl) {
      process.env.EXPO_PACKAGER_PROXY_URL = tunnel.publicUrl;
      process.env.PUBLIC_URL = tunnel.publicUrl;
      writeFileSync(urlFile, tunnel.publicUrl, "utf8");
    }
  } catch (err) {
    console.warn(`[tunnel] ⚠️ Could not start custom tunnel: ${err.message}`);
  }
} else {
  console.log(`[tunnel] No TUNNEL_TOKEN or tunl CLI config found. Running in direct local mode.`);
}

// Start Expo dev server (clean without --tunnel)
const args = ["scripts/expo-logger.js", "start", "--port", String(port), ...process.argv.slice(2)];
const child = spawn("node", args, {
  stdio: "inherit",
  env: process.env,
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

