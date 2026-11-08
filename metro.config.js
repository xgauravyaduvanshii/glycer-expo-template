// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');
const crypto = require('crypto');

const defaultConfig = getDefaultConfig(__dirname);

// Use a stable cache directory that persists
const METRO_CACHE_DIR = path.join(__dirname, '.metro-cache');

// Create a stable cache version based on package.json (not timestamps or env vars)
// IMPORTANT: We explicitly exclude EXPO_PUBLIC_* env vars from cache key
// because they change between build time and runtime, but don't affect the bundle
const packageJson = require('./package.json');
const cacheVersion = crypto
  .createHash('md5')
  .update(JSON.stringify({
    name: packageJson.name,
    dependencies: packageJson.dependencies,
    devDependencies: packageJson.devDependencies,
    // Add a fixed salt to ensure consistent hashing
    _salt: 'glycer-stable-cache-v1',
  }))
  .digest('hex')
  .slice(0, 8);

// Log cache version for debugging
console.log(`[Metro] Cache version: ${cacheVersion}`);

module.exports = {
  ...defaultConfig,
  // Configure persistent cache for TRANSFORMS only (not bundles)
  // This caches individual file transforms but rebuilds bundles on file changes
  cacheStores: ({ FileStore }) => [
    new FileStore({
      root: METRO_CACHE_DIR,
    }),
  ],
  // Use stable cache version based on dependencies, not timestamps
  cacheVersion: cacheVersion,
  // Don't reset cache on startup - but Metro will still detect file changes
  resetCache: false,
  // File watching configuration
  watcher: {
    ...defaultConfig.watcher,
    // Try watchman first (faster), fall back to polling if it fails
    // Watchman is installed in the Docker container
    watchman: true,
    // If watchman fails, use polling with a reasonable interval
    additionalExts: defaultConfig.watcher?.additionalExts || [],
  },
  // Server configuration
  server: {
    ...defaultConfig.server,
    // Ensure bundles are not cached by the server
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Add no-cache headers for bundle requests
        if (req.url && req.url.includes('.bundle')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
        return middleware(req, res, next);
      };
    },
  },
  transformer: {
    ...defaultConfig.transformer,
    // Enable Hermes for faster transforms
    hermesParser: true,
    // Minification is expensive - skip in dev
    minifierConfig: {
      mangle: false,
    },
  },
  // Resolver optimizations
  resolver: {
    ...defaultConfig.resolver,
    // Cache resolution results
    hasteImplModulePath: undefined,
  },
};
