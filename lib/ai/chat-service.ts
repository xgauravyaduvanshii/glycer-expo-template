/*
IMPORTANT NOTICE: DO NOT REMOVE
./lib/ai/chat-service.ts
Provider-neutral chat helper for the Glycer inference gateway.

The gateway resolves the upstream provider and model on the server from the
session owner's connections. This module never names a provider and never holds
an API key; it only posts to the gateway's /v1/chat/completions endpoint with
the scoped session token. Streaming is not supported - responses arrive whole.

Model selection is optional. Omit `model` to use the session owner's default
chat model, or pass an exact selection string ("<connectionId>::<modelId>").

For structured (JSON) output, validate the parsed value with zod in the app -
generateStructuredText only guarantees the reply parsed as JSON, not its shape.
*/
import { fetch } from "expo/fetch";
import { getAPIClient } from "@/lib/ai/gateway-client";

export type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

export type ChatUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type ChatOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

type ChatCompletionResponse = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: "assistant"; content: string };
    finish_reason: string;
  }>;
  usage?: ChatUsage;
};

type GatewayErrorBody = { error?: string; code?: string };

/**
 * POST a chat completion request to the gateway and return the parsed response.
 * Gateway errors ({ error, code }) are surfaced verbatim so app code can show them.
 */
async function requestChat(
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<ChatCompletionResponse> {
  const client = getAPIClient();

  const res = await fetch(`${client.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: client.headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as GatewayErrorBody | null;
    throw new Error(detail?.error || `The AI gateway request failed (status ${res.status}).`);
  }

  return (await res.json()) as ChatCompletionResponse;
}

/**
 * Send a conversation to the gateway and return the assistant reply plus token usage.
 * `model` is omitted unless the caller provides an explicit selection.
 */
export async function generateChatText(
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<{ content: string; usage?: ChatUsage }> {
  const body: Record<string, unknown> = { messages };
  if (options?.model) body.model = options.model;
  if (options?.temperature !== undefined) body.temperature = options.temperature;
  if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens;

  const data = await requestChat(body, options?.signal);
  const content = data.choices?.[0]?.message?.content ?? "";
  return { content, usage: data.usage };
}

/**
 * Convenience wrapper: send a single user message and get the text back.
 */
export async function generateTextResponse(
  prompt: string,
  options?: ChatOptions
): Promise<{ content: string }> {
  const { content } = await generateChatText([{ role: "user", content: prompt }], options);
  return { content };
}

/**
 * Strip markdown code fences from a model reply so JSON.parse can run on it.
 */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Ask the model for JSON only and parse it into `T`, retrying once if the reply
 * is not valid JSON (two attempts total). Validate the result with zod in the app.
 * Throws a friendly error if the model never returns valid JSON.
 */
export async function generateStructuredText<T>(
  prompt: string,
  options?: { model?: string; instruction?: string }
): Promise<T> {
  const instruction =
    options?.instruction ?? "Return only valid JSON that matches the requested shape.";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a precise data assistant. ${instruction} Do not include prose, commentary, or markdown fences.`,
    },
    { role: "user", content: prompt },
  ];

  const maxAttempts = 2;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { content } = await generateChatText(messages, { model: options?.model });

    try {
      return JSON.parse(stripCodeFences(content)) as T;
    } catch {
      if (attempt === maxAttempts - 1) break;
      // Nudge the model to correct itself on the retry.
      messages.push({ role: "assistant", content });
      messages.push({
        role: "user",
        content: "That response was not valid JSON. Reply again with only valid JSON.",
      });
    }
  }

  throw new Error("The AI model did not return valid JSON. Please try rephrasing your request.");
}
