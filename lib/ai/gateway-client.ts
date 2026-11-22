/*
IMPORTANT NOTICE: DO NOT REMOVE OR MODIFY
This is the client for the Glycer inference gateway (the Glycer server).

How the gateway works:
- The app sends inference requests to the gateway over https; the gateway
  resolves which upstream provider and model to use on the server, from the
  session owner's connections. Resolution happens entirely server-side.
- Requests authenticate with a single scoped session token (x-session-token).
  That token grants inference access only; it is not a user credential.
- There are NO API keys in this app. No provider key is ever sent to or
  stored in the sandbox.
- Only two endpoints exist: /v1/chat/completions and /v1/images/generations.
  Streaming is not supported, so requests receive the whole response at once.

Configuration comes from .env.local via process.env.
NEVER use localhost - the app runs on the user's phone.
*/

import {
  getGatewayBaseUrl,
  getSessionToken,
} from './sandbox-config';

export type APIClient = {
  baseUrl: string;
  headers: Record<string, string>;
};

// Cache the client to avoid recreating it on every call
let cachedClient: APIClient | null = null;

export const getAPIClient = (): APIClient => {
  // Return cached client if available
  if (cachedClient) {
    return cachedClient;
  }

  const baseUrl = getGatewayBaseUrl();
  const sessionToken = getSessionToken();

  if (!sessionToken) {
    console.warn('EXPO_PUBLIC_SESSION_TOKEN not set - AI gateway calls will fail');
  }

  cachedClient = {
    baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken,
    },
  };

  return cachedClient;
};

// Clear the cache (useful if config changes at runtime)
export const clearAPIClientCache = () => {
  cachedClient = null;
};
