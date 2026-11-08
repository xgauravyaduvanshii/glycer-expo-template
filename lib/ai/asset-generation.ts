/*
IMPORTANT NOTICE: DO NOT REMOVE
./lib/ai/asset-generation.ts
Asset Generation Service using GPT Image 1.5 API.
Uses the Multi-API proxy (port 4000) for image generation.

Features:
- Generate images from text prompts
- Edit existing images
- Support for transparent backgrounds (PNG/WebP)
- Multiple quality levels (low, medium, high, auto)
- Various sizes (1024x1024, 1024x1536, 1536x1024)

For CLI usage, see: scripts/generate-asset.js
*/

import { getAPIClient } from "@/lib/ai/openrouter";

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

/**
 * Generate images using GPT Image 1.5 API
 * Returns base64 data or URL depending on API response
 */
export async function generateImage(
  prompt: string,
  options?: ImageGenOptions
): Promise<ImageGenResult[]> {
  const client = getAPIClient();
  const model = options?.model || "gpt-image-1.5";

  const body: Record<string, unknown> = {
    model,
    prompt,
    n: options?.n || 1,
    size: options?.size || "1024x1024",
    quality: options?.quality || "auto",
    background: options?.background || "opaque",
  };

  // Add output format for GPT Image models
  if (model.startsWith("gpt-image")) {
    body.output_format = options?.outputFormat || "png";
  }

  const res = await fetch(`${client.baseUrl}/v1/images/generations`, {
    method: "POST",
    headers: client.headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Image generation error ${res.status}: ${txt}`);
  }

  const data = (await res.json()) as { data: ImageGenResult[] };
  return data.data;
}

/**
 * Generate a single image and return as base64 data URL
 */
export async function generateImageAsDataUrl(
  prompt: string,
  options?: ImageGenOptions
): Promise<string> {
  const results = await generateImage(prompt, { ...options, n: 1 });
  const result = results[0];

  if (result.b64_json) {
    const format = options?.outputFormat || "png";
    return `data:image/${format};base64,${result.b64_json}`;
  }

  if (result.url) {
    return result.url;
  }

  throw new Error("No image data returned");
}

/**
 * Edit an existing image using GPT Image API
 * @param imageBase64 - Base64 encoded image data (without data URL prefix)
 * @param prompt - Description of the edit to make
 */
export async function editImage(
  imageBase64: string,
  prompt: string,
  options?: ImageGenOptions
): Promise<ImageGenResult[]> {
  const client = getAPIClient();
  const model = options?.model || "gpt-image-1.5";

  // For edits endpoint, we need to use FormData
  const formData = new FormData();

  // Convert base64 to blob
  const byteCharacters = atob(imageBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "image/png" });

  formData.append("image", blob, "image.png");
  formData.append("model", model);
  formData.append("prompt", prompt);
  formData.append("n", String(options?.n || 1));
  formData.append("size", options?.size || "1024x1024");
  formData.append("quality", options?.quality || "auto");

  const res = await fetch(`${client.baseUrl}/v1/images/edits`, {
    method: "POST",
    headers: {
      "x-session-token": client.headers["x-session-token"],
    },
    body: formData,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Image edit error ${res.status}: ${txt}`);
  }

  const data = (await res.json()) as { data: ImageGenResult[] };
  return data.data;
}

/**
 * Helper to convert aspect ratio string to size
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
