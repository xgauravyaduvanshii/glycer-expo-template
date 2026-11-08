import { startTunnel } from "@urmatetech/tunl-sdk";
import { spawn } from "node:child_process";

const port = parseInt(process.env.PORT || "3000", 10);
const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || `app-${Date.now()}`;

let tunnel = null;

if (process.env.TUNNEL_TOKEN) {
  try {
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
    }
  } catch (err) {
    console.warn(`[tunnel] ⚠️ Could not start custom tunnel: ${err.message}`);
  }
} else {
  console.log(`[tunnel] No TUNNEL_TOKEN provided. Running in direct local mode.`);
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

