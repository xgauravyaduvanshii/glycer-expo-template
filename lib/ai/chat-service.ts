/*
IMPORTANT NOTICE: DO NOT REMOVE
./lib/ai/chat-service.ts
AI Chat Service for text generation, image analysis, and streaming.
Uses the Multi-API proxy (port 4000) which routes to OpenAI, Anthropic, or Grok.

Available Models:
- OpenAI: gpt-5-2025-08-07 (default), gpt-5.2, gpt-4o, gpt-4o-mini (supports images)
- Anthropic: claude-sonnet-4-5-20250929 (default), claude-haiku-4-5-20251001, claude-opus-4-5-20251101
- Grok: grok-4-latest (default), grok-4.1-fast

Streaming Support:
- Use streamOpenAIChat, streamAnthropicChat, or streamGrokChat for streaming responses
- Uses expo/fetch for WinterCG-compliant streaming across web and mobile
*/
import { fetch } from "expo/fetch";
import { AIMessage, AIRequestOptions, AIResponse } from "@/lib/types/ai";
import { getAPIClient } from "@/lib/ai/openrouter";

type ChatResponse = {
  id: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  choices: Array<{ index: number; message: { role: string; content: string } }>;
};

type AnthropicResponse = {
  id: string;
  content: Array<{ type: string; text: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

// Streaming callback type
export type StreamCallback = (chunk: string, done: boolean) => void;

// ============================================================================
// Non-Streaming Functions
// ============================================================================

/**
 * Send a chat completion request to OpenAI-compatible endpoint
 *
 * IMPORTANT API COMPATIBILITY NOTES:
 * - Some models (like o1, reasoning models) do NOT support temperature parameter - only default (1) is allowed
 * - Some models require `max_completion_tokens` instead of `max_tokens`
 * - When in doubt, omit temperature and use max_completion_tokens for better compatibility
 */
async function postOpenAIChat(model: string, messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> {
  const client = getAPIClient();
  const modelName = options?.model || model;

  // Build request body with only supported parameters
  // NOTE: We use max_completion_tokens (newer API) instead of max_tokens for better compatibility
  // NOTE: We omit temperature entirely as some models (reasoning models) only support default temperature
  const requestBody: Record<string, unknown> = {
    model: modelName,
    messages,
    max_completion_tokens: options?.maxTokens ?? 4096,
  };

  // Only add top_p if explicitly provided (some models may not support it)
  if (options?.topP !== undefined) {
    requestBody.top_p = options.topP;
  }

  const res = await fetch(`${client.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: client.headers,
    body: JSON.stringify(requestBody),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as ChatResponse;
  const content = data.choices[0]?.message?.content ?? "";
  return {
    content,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
  };
}

/**
 * Send a message request to Anthropic endpoint
 */
async function postAnthropicChat(model: string, messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> {
  const client = getAPIClient();
  const res = await fetch(`${client.baseUrl}/v1/messages`, {
    method: "POST",
    headers: client.headers,
    body: JSON.stringify({
      model: options?.model || model,
      messages,
      max_tokens: options?.maxTokens ?? 4096,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as AnthropicResponse;
  const content = data.content[0]?.text ?? "";
  return {
    content,
    usage: {
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
      totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    },
  };
}

// ============================================================================
// Streaming Functions (using expo/fetch)
// ============================================================================

/**
 * Parse SSE (Server-Sent Events) data from a chunk
 */
function parseSSEChunk(chunk: string): string[] {
  const lines = chunk.split("\n");
  const contents: string[] = [];

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        // OpenAI/Grok format
        if (parsed.choices?.[0]?.delta?.content) {
          contents.push(parsed.choices[0].delta.content);
        }
        // Anthropic format
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          contents.push(parsed.delta.text);
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  return contents;
}

/**
 * Stream chat completion from OpenAI-compatible endpoint
 * Uses expo/fetch for cross-platform streaming support
 *
 * IMPORTANT: Uses max_completion_tokens (not max_tokens) and omits temperature
 * for compatibility with reasoning models that don't support these parameters.
 */
export async function streamOpenAIChat(
  messages: AIMessage[],
  onChunk: StreamCallback,
  options?: AIRequestOptions
): Promise<string> {
  const client = getAPIClient();
  const model = options?.model || "gpt-5-2025-08-07";

  // Build request body - omit temperature for compatibility with reasoning models
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    max_completion_tokens: options?.maxTokens ?? 4096,
    stream: true,
  };

  if (options?.topP !== undefined) {
    requestBody.top_p = options.topP;
  }

  const res = await fetch(`${client.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      ...client.headers,
      Accept: "text/event-stream",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const contents = parseSSEChunk(chunk);

      for (const content of contents) {
        fullContent += content;
        onChunk(content, false);
      }
    }
  } finally {
    reader.releaseLock();
  }

  onChunk("", true);
  return fullContent;
}

/**
 * Stream chat completion from Anthropic endpoint
 * Uses expo/fetch for cross-platform streaming support
 */
export async function streamAnthropicChat(
  messages: AIMessage[],
  onChunk: StreamCallback,
  options?: AIRequestOptions
): Promise<string> {
  const client = getAPIClient();
  const model = options?.model || "claude-sonnet-4-5-20250929";

  const res = await fetch(`${client.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      ...client.headers,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const contents = parseSSEChunk(chunk);

      for (const content of contents) {
        fullContent += content;
        onChunk(content, false);
      }
    }
  } finally {
    reader.releaseLock();
  }

  onChunk("", true);
  return fullContent;
}

/**
 * Stream chat completion from Grok endpoint
 * Uses expo/fetch for cross-platform streaming support
 *
 * IMPORTANT: Uses max_completion_tokens (not max_tokens) and omits temperature
 * for compatibility with models that don't support these parameters.
 */
export async function streamGrokChat(
  messages: AIMessage[],
  onChunk: StreamCallback,
  options?: AIRequestOptions
): Promise<string> {
  const client = getAPIClient();
  const model = options?.model || "grok-4-latest";

  // Build request body - omit temperature for compatibility
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    max_completion_tokens: options?.maxTokens ?? 4096,
    stream: true,
  };

  if (options?.topP !== undefined) {
    requestBody.top_p = options.topP;
  }

  const res = await fetch(`${client.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      ...client.headers,
      Accept: "text/event-stream",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Grok API error ${res.status}: ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const contents = parseSSEChunk(chunk);

      for (const content of contents) {
        fullContent += content;
        onChunk(content, false);
      }
    }
  } finally {
    reader.releaseLock();
  }

  onChunk("", true);
  return fullContent;
}

// ============================================================================
// OpenAI Functions (Non-Streaming)
// ============================================================================

export const getOpenAITextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions
): Promise<AIResponse> => {
  const defaultModel = "gpt-5-2025-08-07"; // Latest GPT-5 with vision support
  return postOpenAIChat(defaultModel, messages, options);
};

export const getOpenAIChatResponse = async (prompt: string): Promise<AIResponse> => {
  return getOpenAITextResponse([{ role: "user", content: prompt }]);
};

// ============================================================================
// Anthropic Functions (Non-Streaming)
// ============================================================================

export const getAnthropicTextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions
): Promise<AIResponse> => {
  const defaultModel = "claude-sonnet-4-5-20250929"; // Latest Claude 4.5 Sonnet
  return postAnthropicChat(defaultModel, messages, options);
};

export const getAnthropicChatResponse = async (prompt: string): Promise<AIResponse> => {
  return getAnthropicTextResponse([{ role: "user", content: prompt }]);
};

// ============================================================================
// Grok Functions (Non-Streaming)
// ============================================================================

export const getGrokTextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions
): Promise<AIResponse> => {
  const defaultModel = "grok-4-latest"; // Latest Grok 4
  return postOpenAIChat(defaultModel, messages, options);
};

export const getGrokChatResponse = async (prompt: string): Promise<AIResponse> => {
  return getGrokTextResponse([{ role: "user", content: prompt }]);
};
