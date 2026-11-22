/*
IMPORTANT NOTICE: DO NOT REMOVE OR MODIFY
This is the API client for the Multi-API proxy running on port 4000.
In the E2B sandbox, this proxy routes to OpenAI, Anthropic, and Grok APIs.

The proxy automatically detects which API to use based on:
- /v1/messages → Anthropic
- /v1/chat/completions with model containing "grok" → Grok
- /v1/chat/completions (default) → OpenAI
- /v1/images/generations → OpenAI (GPT Image)

All requests require the x-session-token header for authentication.

Configuration comes from .env.local via process.env.
NEVER use localhost - the app runs on the user's phone.
*/

import {
  getProxyBaseUrl,
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

  const baseUrl = getProxyBaseUrl();
  const sessionToken = getSessionToken();

  if (!sessionToken) {
    console.warn('EXPO_PUBLIC_SESSION_TOKEN not set - API calls will fail');
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

// Alias for backwards compatibility
export const getOpenRouterClient = getAPIClient;
