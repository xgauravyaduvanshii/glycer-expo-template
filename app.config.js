/**
 * Expo App Configuration
 *
 * This file is used instead of app.json to enable dynamic configuration.
 * Environment variables are loaded from .env.local via process.env.
 */

// Load dotenv for local development (in sandbox, env vars come from .env.local)
const fs = require('fs');
const path = require('path');

// Try to load .env.local if it exists
const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

module.exports = {
  name: "Glycer App",
  slug: "glycer-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "glycer",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#FAFAFA"
      }
    ],
    "expo-font",
    "expo-web-browser"
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    // Add router config for expo-router
    router: {
      origin: false,
    },
    // EAS project ID if needed
    eas: {
      projectId: process.env.EAS_PROJECT_ID || undefined,
    },
  },
};
