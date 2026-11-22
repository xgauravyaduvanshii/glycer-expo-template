/*
IMPORTANT NOTICE: DO NOT REMOVE
./lib/ai/asset-generation.ts
Image asset generation through the Glycer AI gateway.

Assets are produced by the session owner's connected image provider, which the
gateway resolves on the server. There is NO API key in this app: requests only
carry the scoped session token to /v1/images/generations, and results come back
as base64 (b64_json). No image-editing endpoint exists, so only text-to-image is
supported here.

Do not hardcode a model - omit it and the server default is used. Pass an exact
selection string ("<connectionId>::<modelId>") only when the user chose one.

For CLI usage, see: scripts/generate-asset.js
*/

import { getAPIClient } from "@/lib/ai/gateway-client";

export type ImageGenOptions = {
  model?: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
  background?: "transparent" | "opaque" | "auto";
  outputFormat?: "png" | "jpeg" | "webp";
  n?: number;
};

export type ImageGenResult = {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
};

type GatewayErrorBody = { error?: string; code?: string };

/**
 * Generate images from a text prompt via the gateway's /v1/images/generations
 * endpoint. Returns base64 results (b64_json). The `model` field is omitted
 * unless the caller supplies an explicit selection so the server default applies.
 */
export async function generateImage(
  prompt: string,
  options?: ImageGenOptions
): Promise<ImageGenResult[]> {
  const client = getAPIClient();

  const body: Record<string, unknown> = {
    prompt,
    n: options?.n ?? 1,
    size: options?.size ?? "1024x1024",
    quality: options?.quality ?? "auto",
    background: options?.background ?? "opaque",
    output_format: options?.outputFormat ?? "png",
  };

  // Only forward a model when the user explicitly selected one; otherwise the
  // gateway uses the session owner's default image model.
  if (options?.model) {
    body.model = options.model;
  }

  const res = await fetch(`${client.baseUrl}/v1/images/generations`, {
    method: "POST",
    headers: client.headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as GatewayErrorBody | null;
    throw new Error(detail?.error || `Image generation failed (status ${res.status}).`);
  }

  const data = (await res.json()) as { data: ImageGenResult[] };
  return data.data;
}

/**
 * Generate a single image and return it as a base64 data URL.
 */
export async function generateImageAsDataUrl(
  prompt: string,
  options?: ImageGenOptions
): Promise<string> {
  const results = await generateImage(prompt, { ...options, n: 1 });
  const result = results[0];

  if (result?.b64_json) {
    const format = options?.outputFormat || "png";
    return `data:image/${format};base64,${result.b64_json}`;
  }

  if (result?.url) {
    return result.url;
  }

  throw new Error("No image data returned");
}

/**
 * Helper to convert an aspect ratio string to a gateway size value.
 */
export function aspectRatioToSize(
  aspectRatio: string
): "1024x1024" | "1536x1024" | "1024x1536" | "auto" {
  switch (aspectRatio) {
    case "1:1":
      return "1024x1024";
    case "3:2":
    case "16:9":
      return "1536x1024";
    case "2:3":
    case "9:16":
      return "1024x1536";
    default:
      return "auto";
  }
}
