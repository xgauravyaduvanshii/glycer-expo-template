#!/usr/bin/env node
/**
 * Metro Bundle Pre-Warmer
 *
 * This script starts Metro, triggers bundle builds for all platforms,
 * waits for them to complete, then shuts down. The cache persists in
 * .metro-cache for subsequent server starts.
 *
 * Usage: node scripts/prewarm-bundle.js
 */

const { spawn } = require('child_process');
const http = require('http');
const https = require('https');

const PORT = 3000;
const PLATFORMS = ['ios', 'web'];
const MAX_WAIT_TIME = 300000; // 5 minutes max
const METRO_READY_POLL_INTERVAL = 2000; // 2 seconds
const BUNDLE_TIMEOUT = 600000; // 10 minutes per bundle

console.log('🔥 Metro Bundle Pre-Warmer Starting...');
console.log(`   Platforms: ${PLATFORMS.join(', ')}`);
console.log(`   Bundle timeout: ${BUNDLE_TIMEOUT / 1000}s per platform\n`);

// Track the Metro process
let metroProcess = null;

/**
 * Wait for Metro server to be ready
 */
async function waitForMetroReady() {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    try {
      const response = await httpGet(`http://localhost:${PORT}/status`);
      if (response.includes('packager-status:running')) {
        console.log('✅ Metro server is ready!\n');
        return true;
      }
    } catch (e) {
      // Server not ready yet
    }

    console.log('⏳ Waiting for Metro to be ready...');
    await sleep(METRO_READY_POLL_INTERVAL);
  }

  throw new Error('Metro server failed to start within timeout');
}

/**
 * Request a bundle for a specific platform
 * For expo-router projects, the entry point is node_modules/expo-router/entry
 *
 * IMPORTANT: With newArchEnabled: true in app.config.js, Metro applies Hermes
 * transform parameters to ALL platforms including web. The prewarm must match
 * the exact parameters that will be requested at runtime.
 */
async function requestBundle(platform) {
  // expo-router uses a different entry point than standard Expo projects
  const entryPoint = 'node_modules/expo-router/entry';

  // Build URL with platform-specific parameters
  // NOTE: With newArchEnabled: true, Hermes params are applied to ALL platforms
  const params = new URLSearchParams({
    platform,
    dev: 'true',
    hot: 'false',
    lazy: 'true',
    'transform.routerRoot': 'app',
    // Hermes transform is used for all platforms when newArchEnabled is true
    'transform.engine': 'hermes',
    'unstable_transformProfile': 'hermes-stable',
  });

  // iOS needs bytecode compilation (web does not)
  if (platform === 'ios') {
    params.set('transform.bytecode', '1');
  }

  const url = `http://localhost:${PORT}/${entryPoint}.bundle?${params.toString()}`;

  console.log(`📦 Requesting ${platform} bundle...`);
  console.log(`   URL: ${url}`);
  console.log(`   Started at: ${new Date().toISOString()}`);
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: BUNDLE_TIMEOUT }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   Finished at: ${new Date().toISOString()}`);
        if (res.statusCode === 200) {
          const sizeKB = (data.length / 1024).toFixed(0);
          const sizeMB = (data.length / 1024 / 1024).toFixed(2);
          console.log(`✅ ${platform} bundle ready (${sizeMB}MB / ${sizeKB}KB in ${duration}s)`);
          resolve(data);
        } else {
          console.error(`❌ ${platform} bundle failed: HTTP ${res.statusCode}`);
          console.error(`   Response: ${data.substring(0, 500)}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Bundle request timeout'));
    });
  });
}

/**
 * Simple HTTP GET helper
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Start Metro bundler
 */
function startMetro() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting Metro bundler (no tunnel for prewarm)...\n');

    // Start Metro WITHOUT tunnel for prewarm - tunnel doesn't affect bundle cache
    // and may fail during Docker build due to network restrictions
    // Use "bun run" to execute expo from node_modules/.bin
    // NOTE: Don't use --web flag as it triggers SSR which requires watch mode
    metroProcess = spawn('bun', ['run', 'expo', 'start', '--port', PORT.toString()], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: {
        ...process.env,
        // Disable interactive mode
        CI: '1',
        EXPO_NO_TELEMETRY: '1',
        // Set placeholder env vars that will be replaced at runtime
        // These ensure the bundle cache is valid regardless of actual sandbox ID
        // The app reads these from .env.local at runtime, so we just need
        // consistent values during pre-warming to populate the cache
        EXPO_PUBLIC_PROJECT_ID: 'prewarm-placeholder',
        EXPO_PUBLIC_SESSION_TOKEN: 'prewarm-placeholder-token',
      }
    });

    let output = '';

    metroProcess.stdout.on('data', (data) => {
      const str = data.toString();
      output += str;
      process.stdout.write(str);
    });

    metroProcess.stderr.on('data', (data) => {
      const str = data.toString();
      output += str;
      process.stderr.write(str);
    });

    metroProcess.on('error', (err) => {
      reject(new Error(`Failed to start Metro: ${err.message}`));
    });

    // Resolve after spawn (we'll wait for ready separately)
    setTimeout(resolve, 1000);
  });
}

/**
 * Stop Metro bundler - kill it after giving time for cache to flush
 */
function stopMetro() {
  return new Promise((resolve) => {
    if (metroProcess) {
      console.log('\n🛑 Stopping Metro bundler...');

      // Give Metro 5 seconds to flush cache, then kill it
      // SIGINT doesn't work reliably with shell: true
      setTimeout(() => {
        console.log('⚠️  Killing Metro process...');
        metroProcess.kill('SIGKILL');
        setTimeout(resolve, 1000);
      }, 5000);
    } else {
      resolve();
    }
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    // Start Metro
    await startMetro();

    // Wait for it to be ready
    await waitForMetroReady();

    // Request bundles for all platforms (sequentially to avoid overload)
    console.log('📦 Building bundles for all platforms...\n');

    for (const platform of PLATFORMS) {
      try {
        await requestBundle(platform);
      } catch (error) {
        console.error(`⚠️  Failed to build ${platform} bundle: ${error.message}`);
        // Continue with other platforms
      }
    }

    console.log('\n✅ Bundle pre-warming complete!');
    console.log('📁 Cache stored in .metro-cache directory\n');

    // Stop Metro gracefully (this waits for exit)
    await stopMetro();

    // Extra wait to ensure filesystem sync (important for Docker layer caching)
    console.log('⏳ Waiting for cache filesystem sync...');
    await sleep(5000);

    // Verify cache was created
    const fs = require('fs');
    const path = require('path');
    const cacheDir = path.join(__dirname, '..', '.metro-cache');

    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir, { recursive: true });
      console.log(`✅ Cache verified: ${files.length} entries in .metro-cache`);
    } else {
      console.error('❌ WARNING: .metro-cache directory not found after prewarm!');
    }

    process.exit(0);

  } catch (error) {
    console.error(`\n❌ Pre-warming failed: ${error.message}`);
    await stopMetro();
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  stopMetro();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopMetro();
  process.exit(0);
});

main();
