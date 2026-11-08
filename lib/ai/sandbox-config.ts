/*
 * SANDBOX CONFIGURATION
 *
 * All values come from .env.local which is created by the E2B startup script.
 * The start-dev.sh script sources .env.local before Metro starts, so
 * EXPO_PUBLIC_* values get baked into the bundle.
 *
 * IMPORTANT: Never use localhost - the app runs on the user's phone,
 * not inside the sandbox. Always use the e2b.app URLs.
 */

// Get project ID from environment (set in .env.local)
export const getProjectId = (): string => {
  return process.env.EXPO_PUBLIC_PROJECT_ID || '';
};

// Get session token from environment (set in .env.local)
export const getSessionToken = (): string => {
  return process.env.EXPO_PUBLIC_SESSION_TOKEN || '';
};

// Get the AI proxy base URL (port 4000)
// NEVER falls back to localhost - that won't work from user's phone
export const getProxyBaseUrl = (): string => {
  const projectId = getProjectId();
  if (!projectId) {
    console.error('EXPO_PUBLIC_PROJECT_ID not set in .env.local');
  }
  return `https://4000-${projectId}.e2b.app`;
};

// Get the backend base URL (Hono/tRPC on port 5000)
// NEVER falls back to localhost - that won't work from user's phone
export const getBackendBaseUrl = (): string => {
  const projectId = getProjectId();
  if (!projectId) {
    console.error('EXPO_PUBLIC_PROJECT_ID not set in .env.local');
  }
  return `https://5000-${projectId}.e2b.app`;
};
