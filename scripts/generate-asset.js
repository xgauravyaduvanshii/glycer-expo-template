#!/usr/bin/env node
/*
Asset Generation CLI for AI Agents
Generates images through the Glycer AI gateway (/v1/images/generations).

The gateway resolves the image provider on the server from the session owner's
connections. No API key is stored here: requests only carry the scoped session
token. There is no image-editing endpoint, so only text-to-image is supported.

Configuration (read from the environment, or from .env.local in the project root):
  EXPO_PUBLIC_AI_GATEWAY_URL   Gateway base URL (defaults to the production gateway)
  EXPO_PUBLIC_SESSION_TOKEN    Scoped inference token sent as x-session-token

Usage:
  node scripts/generate-asset.js --prompt "a cute cat" --output ./assets/cat.png
  node scripts/generate-asset.js --prompt "app icon for a fitness app" --output ./assets/icon.png --size 1024x1024 --background transparent

Options:
  --prompt TEXT       Description of the image to generate (required)
  --output PATH       Output file path (required)
  --size SIZE         Image size: 1024x1024, 1024x1536, 1536x1024 (default: 1024x1024)
  --quality QUALITY   Quality: low, medium, high, auto (default: auto)
  --background BG     Background: transparent, opaque, auto (default: opaque)
  --format FORMAT     Output format: png, jpeg, webp (default: png)
  --n COUNT           Number of images to generate (default: 1)

For long-running generation, use with nohup:
  nohup node scripts/generate-asset.js --prompt "..." --output ./assets/image.png > generate.log 2>&1 &

Examples:
  # Generate an app icon with transparent background
  node scripts/generate-asset.js --prompt "minimalist app icon for a meditation app, zen garden style" --output ./assets/icon.png --background transparent

  # Generate a splash screen
  node scripts/generate-asset.js --prompt "gradient background with subtle geometric patterns for meditation app" --output ./assets/splash.png --size 1024x1536
*/

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const DEFAULT_GATEWAY_URL = 'https://glycer.flyingdarkdev.com/api/gateway';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    prompt: null,
    output: null,
    size: '1024x1024',
    quality: 'auto',
    background: 'opaque',
    format: 'png',
    edit: null,
    n: 1,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--prompt':
        options.prompt = nextArg;
        i++;
        break;
      case '--output':
        options.output = nextArg;
        i++;
        break;
      case '--size':
        options.size = nextArg;
        i++;
        break;
      case '--quality':
        options.quality = nextArg;
        i++;
        break;
      case '--background':
        options.background = nextArg;
        i++;
        break;
      case '--format':
        options.format = nextArg;
        i++;
        break;
      case '--edit':
        options.edit = nextArg;
        i++;
        break;
      case '--n':
        options.n = parseInt(nextArg, 10);
        i++;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Asset Generation CLI for AI Agents (Glycer AI gateway)

Usage:
  node scripts/generate-asset.js --prompt "description" --output ./path/to/output.png

Options:
  --prompt TEXT       Description of the image to generate (required)
  --output PATH       Output file path (required)
  --size SIZE         Image size: 1024x1024, 1024x1536, 1536x1024 (default: 1024x1024)
  --quality QUALITY   Quality: low, medium, high, auto (default: auto)
  --background BG     Background: transparent, opaque, auto (default: opaque)
  --format FORMAT     Output format: png, jpeg, webp (default: png)
  --n COUNT           Number of images to generate (default: 1)

Configuration is read from the environment or from .env.local in the project root:
  EXPO_PUBLIC_AI_GATEWAY_URL   (default: ${DEFAULT_GATEWAY_URL})
  EXPO_PUBLIC_SESSION_TOKEN    Scoped inference token (sent as x-session-token)

Note: image editing is not supported - the gateway exposes only text-to-image.

Examples:
  # Generate an app icon
  node scripts/generate-asset.js --prompt "app icon for fitness app" --output ./assets/icon.png

  # Generate with transparent background
  node scripts/generate-asset.js --prompt "logo on transparent" --output ./assets/logo.png --background transparent
`);
}

// Read a single variable from an env file (KEY=value), if present.
function readEnvFile(name) {
  for (const file of ['.env.local', '.expo_env']) {
    try {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const match = content.match(new RegExp(`${name}=(.+)`));
      if (match) return match[1].trim();
    } catch (e) {
      // File doesn't exist, that's fine
    }
  }
  return null;
}

// Environment variable first, then .env.local / .expo_env.
function readEnv(name) {
  return process.env[name] || readEnvFile(name);
}

// Get the scoped session token for gateway authentication.
function getSessionToken() {
  const token = readEnv('EXPO_PUBLIC_SESSION_TOKEN');
  if (!token) {
    console.error('Error: No session token found. Set EXPO_PUBLIC_SESSION_TOKEN in .env.local.');
    process.exit(1);
  }
  return token;
}

// Gateway base URL: env value or the production default. Never localhost.
function getBaseUrl() {
  const configured = readEnv('EXPO_PUBLIC_AI_GATEWAY_URL');
  if (configured) return configured.replace(/\/+$/, '');
  return DEFAULT_GATEWAY_URL;
}

// Make an HTTP(S) request; resolves with { status, data } for any status.
function makeRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const httpModule = isHttps ? https : http;

    const req = httpModule.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', reject);
    req.setTimeout(300000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// Extract a friendly message from a gateway error body ({ error, code }).
function gatewayErrorMessage(status, raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.error) return parsed.error;
  } catch (e) {
    // Not JSON; fall through to the status text.
  }
  return `Gateway request failed (HTTP ${status}): ${raw}`;
}

// Generate images via the gateway (/v1/images/generations). The model is omitted
// so the server default is used.
async function generateImage(options) {
  const baseUrl = getBaseUrl();
  const sessionToken = getSessionToken();

  const requestBody = {
    prompt: options.prompt,
    n: options.n,
    size: options.size,
    quality: options.quality,
    background: options.background,
    output_format: options.format,
  };

  console.log(`Generating image: "${options.prompt.substring(0, 50)}..."`);
  console.log(`Size: ${options.size}, Quality: ${options.quality}, Background: ${options.background}`);

  const response = await makeRequest(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken,
    },
  }, JSON.stringify(requestBody));

  if (response.status >= 400) {
    throw new Error(gatewayErrorMessage(response.status, response.data));
  }

  const result = JSON.parse(response.data);
  if (!result || !Array.isArray(result.data)) {
    throw new Error('The gateway returned no image data.');
  }
  return result.data;
}

// Save image to file
function saveImage(imageData, outputPath, format) {
  const resolvedPath = path.resolve(outputPath);
  const dir = path.dirname(resolvedPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let buffer;
  if (imageData.b64_json) {
    buffer = Buffer.from(imageData.b64_json, 'base64');
  } else if (imageData.url) {
    // The gateway returns base64 (b64_json); a URL is unexpected but noted.
    console.log(`Image URL: ${imageData.url}`);
    console.log('Note: URL returned instead of base64. Download manually if needed.');
    return;
  } else {
    throw new Error('No image data in response');
  }

  fs.writeFileSync(resolvedPath, buffer);
  console.log(`Saved: ${resolvedPath}`);

  if (imageData.revised_prompt) {
    console.log(`Revised prompt: ${imageData.revised_prompt}`);
  }
}

// Main function
async function main() {
  const options = parseArgs();

  // Image editing is not supported by the gateway.
  if (options.edit) {
    console.error('Error: image editing is not supported. The Glycer AI gateway exposes only text-to-image generation.');
    process.exit(1);
  }

  // Validate required options
  if (!options.prompt) {
    console.error('Error: --prompt is required');
    process.exit(1);
  }
  if (!options.output) {
    console.error('Error: --output is required');
    process.exit(1);
  }

  // Validate size
  const validSizes = ['1024x1024', '1024x1536', '1536x1024'];
  if (!validSizes.includes(options.size)) {
    console.error(`Error: Invalid size. Must be one of: ${validSizes.join(', ')}`);
    process.exit(1);
  }

  // Validate quality
  const validQualities = ['low', 'medium', 'high', 'auto'];
  if (!validQualities.includes(options.quality)) {
    console.error(`Error: Invalid quality. Must be one of: ${validQualities.join(', ')}`);
    process.exit(1);
  }

  // Validate background
  const validBackgrounds = ['transparent', 'opaque', 'auto'];
  if (!validBackgrounds.includes(options.background)) {
    console.error(`Error: Invalid background. Must be one of: ${validBackgrounds.join(', ')}`);
    process.exit(1);
  }

  // Validate format
  const validFormats = ['png', 'jpeg', 'webp'];
  if (!validFormats.includes(options.format)) {
    console.error(`Error: Invalid format. Must be one of: ${validFormats.join(', ')}`);
    process.exit(1);
  }

  try {
    const results = await generateImage(options);

    // Save the generated images
    for (let i = 0; i < results.length; i++) {
      let outputPath = options.output;

      // If generating multiple images, add index to filename
      if (results.length > 1) {
        const ext = path.extname(outputPath);
        const base = outputPath.slice(0, -ext.length);
        outputPath = `${base}-${i + 1}${ext}`;
      }

      saveImage(results[i], outputPath, options.format);
    }

    console.log('\nDone!');
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

main();
