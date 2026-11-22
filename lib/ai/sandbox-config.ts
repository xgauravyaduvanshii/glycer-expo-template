/*
 * SANDBOX CONFIGURATION
 *
 * All values come from .env.local which is created by the E2B startup script.
 * The start-dev.sh script sources .env.local before Metro starts, so
 * EXPO_PUBLIC_* values get baked into the bundle.
 *
 * The AI gateway is the Glycer server (NOT a sandbox-side proxy). It resolves
 * providers on the server from the session owner's connections, so no provider
 * API key ever reaches this app. See getGatewayBaseUrl() and getSessionToken().
 *
 * IMPORTANT: Never use localhost - the app runs on the user's phone,
 * not inside the sandbox. Always use the deployed https gateway/backend URLs.
 */

// Get project ID from environment (set in .env.local)
export const getProjectId = (): string => {
  return process.env.EXPO_PUBLIC_PROJECT_ID || '';
};

// Get session token from environment (set in .env.local)
// This is the sandbox-scoped inference token: it grants access to the AI gateway
// only, and is not a user credential.
export const getSessionToken = (): string => {
  return process.env.EXPO_PUBLIC_SESSION_TOKEN || '';
};

// Get the AI gateway base URL (the Glycer server's inference endpoint).
// Falls back to the production gateway when EXPO_PUBLIC_AI_GATEWAY_URL is unset.
// NEVER falls back to localhost or a sandbox port host - neither is reachable
// from the user's phone.
export const getGatewayBaseUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_AI_GATEWAY_URL;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return 'https://glycer.flyingdarkdev.com/api/gateway';
};

// Get the backend base URL (Hono/tRPC on port 5000)
// This is the app's own backend, unrelated to AI inference.
// NEVER falls back to localhost - that won't work from user's phone
export const getBackendBaseUrl = (): string => {
  const projectId = getProjectId();
  if (!projectId) {
    console.error('EXPO_PUBLIC_PROJECT_ID not set in .env.local');
  }
  return `https://5000-${projectId}.e2b.app`;
};
