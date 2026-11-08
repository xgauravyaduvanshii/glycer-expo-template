#!/usr/bin/env node
/*
Asset Generation CLI for Claude/AI Agents
Uses the Multi-API proxy (port 4000) for GPT Image 1.5 generation.

Usage:
  node scripts/generate-asset.js --prompt "a cute cat" --output ./assets/cat.png
  node scripts/generate-asset.js --prompt "app icon for a fitness app" --output ./assets/icon.png --size 1024x1024 --background transparent
  node scripts/generate-asset.js --edit ./assets/logo.png --prompt "make it blue" --output ./assets/logo-blue.png

Options:
  --prompt TEXT       Description of the image to generate (required)
  --output PATH       Output file path (required)
  --size SIZE         Image size: 1024x1024, 1024x1536, 1536x1024 (default: 1024x1024)
  --quality QUALITY   Quality: low, medium, high, auto (default: auto)
  --background BG     Background: transparent, opaque, auto (default: opaque)
  --format FORMAT     Output format: png, jpeg, webp (default: png)
  --edit PATH         Path to image to edit (for image editing mode)
  --n COUNT           Number of images to generate (default: 1)

For long-running generation, use with nohup:
  nohup node scripts/generate-asset.js --prompt "..." --output ./assets/image.png > generate.log 2>&1 &

Examples:
  # Generate an app icon with transparent background
  node scripts/generate-asset.js --prompt "minimalist app icon for a meditation app, zen garden style" --output ./assets/icon.png --background transparent

  # Generate a splash screen
  node scripts/generate-asset.js --prompt "gradient background with subtle geometric patterns for meditation app" --output ./assets/splash.png --size 1024x1536

  # Edit an existing image
  node scripts/generate-asset.js --edit ./assets/logo.png --prompt "change the color to blue and add a subtle glow" --output ./assets/logo-v2.png
*/

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

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
Asset Generation CLI for AI Agents

Usage:
  node scripts/generate-asset.js --prompt "description" --output ./path/to/output.png

Options:
  --prompt TEXT       Description of the image to generate (required)
  --output PATH       Output file path (required)
  --size SIZE         Image size: 1024x1024, 1024x1536, 1536x1024 (default: 1024x1024)
  --quality QUALITY   Quality: low, medium, high, auto (default: auto)
  --background BG     Background: transparent, opaque, auto (default: opaque)
  --format FORMAT     Output format: png, jpeg, webp (default: png)
  --edit PATH         Path to image to edit (for image editing mode)
  --n COUNT           Number of images to generate (default: 1)

Examples:
  # Generate an app icon
  node scripts/generate-asset.js --prompt "app icon for fitness app" --output ./assets/icon.png

  # Generate with transparent background
  node scripts/generate-asset.js --prompt "logo on transparent" --output ./assets/logo.png --background transparent

  # Edit an existing image
  node scripts/generate-asset.js --edit ./assets/old.png --prompt "make it blue" --output ./assets/new.png
`);
}

// Get session token from environment or file
function getSessionToken() {
  // Check environment variable first
  if (process.env.EXPO_PUBLIC_SESSION_TOKEN) {
    return process.env.EXPO_PUBLIC_SESSION_TOKEN;
  }

  // Try to read from .env.local
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/EXPO_PUBLIC_SESSION_TOKEN=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {
    // File doesn't exist, that's fine
  }

  // Try .expo_env file
  try {
    const envPath = path.join(process.cwd(), '.expo_env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/EXPO_PUBLIC_SESSION_TOKEN=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {
    // File doesn't exist, that's fine
  }

  console.error('Error: No session token found. Set EXPO_PUBLIC_SESSION_TOKEN environment variable.');
  process.exit(1);
}

// Get base URL for the proxy
function getBaseUrl() {
  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || '';

  if (projectId && projectId !== 'local') {
    return `https://4000-${projectId}.e2b.app`;
  }

  return 'http://localhost:4000';
}

// Make HTTP request to the proxy
function makeRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const httpModule = isHttps ? https : http;

    const req = httpModule.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          resolve({ status: res.statusCode, data });
        }
      });
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

// Generate image using GPT Image 1.5
async function generateImage(options) {
  const baseUrl = getBaseUrl();
  const sessionToken = getSessionToken();

  const requestBody = {
    model: 'gpt-image-1.5',
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

  const result = JSON.parse(response.data);

  if (result.error) {
    throw new Error(result.error.message || 'Image generation failed');
  }

  return result.data;
}

// Edit existing image using GPT Image 1.5
async function editImage(options) {
  const baseUrl = getBaseUrl();
  const sessionToken = getSessionToken();

  // Read the source image
  const imagePath = path.resolve(options.edit);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Source image not found: ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');

  // For multipart/form-data we need to build the boundary manually
  const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

  let formBody = '';
  formBody += `--${boundary}\r\n`;
  formBody += `Content-Disposition: form-data; name="image"; filename="image.png"\r\n`;
  formBody += `Content-Type: image/png\r\n\r\n`;

  const formStart = Buffer.from(formBody);
  const imageData = Buffer.from(imageBase64, 'base64');

  let formEnd = `\r\n--${boundary}\r\n`;
  formEnd += `Content-Disposition: form-data; name="model"\r\n\r\ngpt-image-1.5\r\n`;
  formEnd += `--${boundary}\r\n`;
  formEnd += `Content-Disposition: form-data; name="prompt"\r\n\r\n${options.prompt}\r\n`;
  formEnd += `--${boundary}\r\n`;
  formEnd += `Content-Disposition: form-data; name="n"\r\n\r\n${options.n}\r\n`;
  formEnd += `--${boundary}\r\n`;
  formEnd += `Content-Disposition: form-data; name="size"\r\n\r\n${options.size}\r\n`;
  formEnd += `--${boundary}\r\n`;
  formEnd += `Content-Disposition: form-data; name="quality"\r\n\r\n${options.quality}\r\n`;
  formEnd += `--${boundary}--\r\n`;

  const formEndBuffer = Buffer.from(formEnd);
  const body = Buffer.concat([formStart, imageData, formEndBuffer]);

  console.log(`Editing image: ${options.edit}`);
  console.log(`Prompt: "${options.prompt.substring(0, 50)}..."`);

  const response = await makeRequest(`${baseUrl}/v1/images/edits`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'x-session-token': sessionToken,
    },
  }, body);

  const result = JSON.parse(response.data);

  if (result.error) {
    throw new Error(result.error.message || 'Image editing failed');
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
    // If we got a URL, we'd need to download it
    // For now, we expect b64_json from GPT Image
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
    let results;

    if (options.edit) {
      // Edit mode
      results = await editImage(options);
    } else {
      // Generate mode
      results = await generateImage(options);
    }

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
